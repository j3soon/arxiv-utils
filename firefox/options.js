async function saveOptionsAsync(e) {
  if (e.submitter.id === "revert") {
    await browser.storage.sync.remove('filename_format');
    await browser.storage.sync.remove('open_in_new_tab');
    await browser.storage.sync.remove('redirect_pdf');
  } else if (e.submitter.id === "update") {
    await browser.storage.sync.set({
      'filename_format': document.querySelector("#new-filename-format").value,
      'open_in_new_tab': document.querySelector("#new-open-in-new-tab").checked,
      'redirect_pdf': document.querySelector("#new-redirect-pdf").checked,
    });
  } else if (e.submitter.id === "revert-pdf-viewer-url-prefix") {
    await browser.storage.sync.remove('pdf_viewer_url_prefix');
  } else if (e.submitter.id === "update-pdf-viewer-url-prefix") {
    await browser.storage.sync.set({
      'pdf_viewer_url_prefix': document.querySelector("#new-pdf-viewer-url-prefix").value,
    });
  } else if (e.submitter.id === "revert-pdf-viewer-default-zoom") {
    await browser.storage.sync.remove('pdf_viewer_default_zoom');
  } else if (e.submitter.id === "update-pdf-viewer-default-zoom") {
    const zoomSelect = document.querySelector("#new-pdf-viewer-default-zoom");
    let zoomValue = zoomSelect.value;

    if (zoomValue === "custom") {
      const customZoomInput = document.querySelector("#custom-pdf-viewer-zoom");
      const customZoomValue = customZoomInput.value;
      if (customZoomValue && !isNaN(customZoomValue)) {
        zoomValue = customZoomValue;
      } else {
        // If invalid, fallback to 'auto'
        zoomValue = 'auto';
      }
    }

    await browser.storage.sync.set({
      'pdf_viewer_default_zoom': zoomValue,
    });
  }
  e.preventDefault();
  await restoreOptionsAsync();
}

async function restoreOptionsAsync() {
  const result = await browser.storage.sync.get({
    'filename_format': '${title}, ${firstAuthor} et al., ${publishedYear}, v${version}.pdf',
    'open_in_new_tab': true,
    'redirect_pdf': true,
    'pdf_viewer_url_prefix': '',
    'pdf_viewer_default_zoom': 'auto',
  });
  const filename_format = result.filename_format;
  document.querySelector("#filename-format").innerText = filename_format;
  document.querySelector("#new-filename-format").value = filename_format;
  const open_in_new_tab = result.open_in_new_tab;
  document.querySelector("#new-open-in-new-tab").checked = open_in_new_tab;
  document.querySelector("#open-in-new-tab").innerText = open_in_new_tab;
  const redirect_pdf = result.redirect_pdf;
  document.querySelector("#new-redirect-pdf").checked = redirect_pdf;
  document.querySelector("#redirect-pdf").innerText = redirect_pdf;
  const pdf_viewer_url_prefix = result.pdf_viewer_url_prefix;
  document.querySelector("#pdf-viewer-url-prefix").innerText = pdf_viewer_url_prefix;
  if (pdf_viewer_url_prefix !== '')
    document.querySelector("#new-pdf-viewer-url-prefix").value = pdf_viewer_url_prefix;
  else
    document.querySelector("#new-pdf-viewer-url-prefix").value = "https://mozilla.github.io/pdf.js/web/viewer.html?file=";
  const pdf_viewer_default_zoom = result.pdf_viewer_default_zoom;
  document.querySelector("#pdf-viewer-default-zoom").innerText = pdf_viewer_default_zoom + (pdf_viewer_default_zoom !== 'auto' && pdf_viewer_default_zoom !== 'page-fit' && pdf_viewer_default_zoom !== 'page-width' && !['25', '50', '75', '100', '125', '150', '200'].includes(pdf_viewer_default_zoom) ? '%' : '');

  // Check if it's a predefined value or custom
  const predefinedValues = ['auto', 'page-fit', 'page-width', '50', '75', '100', '125', '150', '200', '300', '400'];
  if (predefinedValues.includes(pdf_viewer_default_zoom)) {
    document.querySelector("#new-pdf-viewer-default-zoom").value = pdf_viewer_default_zoom;
    toggleCustomZoomInput('hide');
  } else {
    // It's a custom value
    document.querySelector("#new-pdf-viewer-default-zoom").value = 'custom';
    document.querySelector("#custom-pdf-viewer-zoom").value = pdf_viewer_default_zoom;
    toggleCustomZoomInput('show');
  }
}

function toggleCustomZoomInput(action) {
  const customZoomContainer = document.querySelector("#custom-zoom-container");
  if (action === 'show') {
    customZoomContainer.style.display = 'block';
  } else {
    customZoomContainer.style.display = 'none';
  }
}

function handleZoomSelectChange() {
  const zoomSelect = document.querySelector("#new-pdf-viewer-default-zoom");
  if (zoomSelect.value === 'custom') {
    toggleCustomZoomInput('show');
  } else {
    toggleCustomZoomInput('hide');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await restoreOptionsAsync();
  
  // Add event listener for zoom dropdown change
  const zoomSelect = document.querySelector("#new-pdf-viewer-default-zoom");
  if (zoomSelect) {
    zoomSelect.addEventListener('change', handleZoomSelectChange);
  }
});

const forms = [...document.getElementsByTagName("form")]
forms.forEach(element => {
  element.addEventListener("submit", saveOptionsAsync);
})
