#!/bin/bash

# === Functions ===============================================================

function usage() {
    cat <<EOM
USAGE: $(basename $0) (all | code | build [--force-master] | dist)
    code:   update the code from the pdf.js repository,
            switching to the latest release
    build:  apply patches for arxiv-utils extension on top of the code
            in pdf.js submodule.
            refuses to build if that code references the \`master\` branch,
            unless you pass the \`--force-master\` switch
    dist:   flatten the pdf.js build and zip into firefox extension
    all:    code + build + dist
EOM
}

function code() {
    cd pdf.js

	echo -e "Updating pdf.js library..."
	git checkout master || return 11
	git pull || return 12

	echo -e "\nRetrieving new releases of pdf.js..."
	# in theory, this part is redundant, since `pull` above would fetch all tags that are on `master`
	# but there's little to lose in getting all the tags
	git fetch --tags || return 13

	echo -e "Finding latest release..."
	# `abbrev` removes the part that identifies the commit:
    # `v3.1.81-143-gc791e01bf` -> `v3.1.81` (actual tag name)
	latest_tag=$(git describe --tags --abbrev=0)
	echo -e "Found release: ${latest_tag}"

	echo -e "\nMoving to the release... ${latest_tag}"
	git checkout --detach ${latest_tag} || return 14

    cd -
}

function build() {
    cd pdf.js

    if ! command -v gulp ; then
        echo "Build failed: could not find gulp. "
        echo "Please check pdf.js installation instructions: https://github.com/mozilla/pdf.js/#getting-the-code"
        return 20
    fi

    curr_branch=$(git branch --show-current)
    if [[ $curr_branch == 'master' && $1 != '--force-master' ]]; then
        echo 'Build failed: trying to build from `master` branch. We generally build only from release branches.'
        echo "    Please run \`${me} code\` first or \`${me} build --force-master\` to build from master"
        return 21
    fi

    # Saving the state to undo it later
    curr_commit=$(git rev-parse HEAD)

	echo -e "\nCustomizing the release..."
    # Note to dev: We will apply our customisations on top of the upstream work,
    # instead of having our customisations permanently committed. This way we avoid
    # state manangement or merging problems when pulling from upstream

    # This will create 3 new commits, based off the current branch
    # However, these are temporary, not tracked by any name, and will be undone
    # after the build, so that the `build` operation can run multiple times without conflicts.
    # This is not a problem, they will be cleaned up by git from time to time.

    # we may need to use --3way in the future
	git am ../pdfjs-patch/000{1..3}-*.patch
    if [[ $? -ne 0 ]]; then
        echo -e '\nApplying patch failed. Reverting...'
        git am --abort
        echo -e 'Reverted. Check why patch failed and try again. Exiting...'
        return 22
    fi

	echo -e "\nCustomization done. Building with customization..."
	gulp minified  # here we do not return if it fails, because we want to undo git

    # surprisingly, there is no reverse to `git am`, so we have to do it manually
    # a hard reset would be the easy way, but it it destructive if we have
    # uncomitted changes to files
	echo -e "\nBuild done. Reverting customization..."
    git reset $curr_commit
    git apply -R ../pdfjs-patch/000{1..3}-*.patch
    if [[ $? -ne 0 ]]; then
        echo -e '\nCould not revert our customizations'
        echo -e 'Leaving pdf.js in dirty state. Please check manually'
        return 23
    fi
	echo -e "Customization reverted."

    cd -
}


# === MAIN ====================================================================

me=$(basename "$0")
# First arg gives which part we should run. By default, all of them
func='all'
if [[ -n "$1" ]] ; then
    func="$1"
    shift
fi

case $func in
    code | build )
        $func $@
        ;;
    all)
        code
        build
        ;;
    *)
        echo "Unknown option: $func ."
        usage && false
        ;;
esac

err_code=$?
if [[ $err_code -ne 0 ]]; then
    echo "${me} failed. Error code: $err_code"
    exit $err_code
else
    echo "Success!"
fi
