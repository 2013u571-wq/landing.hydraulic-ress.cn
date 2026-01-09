const GSHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbxvl9vQv2fQSJfYrSEtL_jGbHAQvVtVZt_KOfnRrgpXL6ZU6QZZJj7xYMjTPaOb6qjyRQ/exec";

function serializeForm(form){
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((v, k) => obj[k] = v);
  obj.page_url = location.href;
  obj.referrer = document.referrer || "";
  obj.timestamp = new Date().toISOString();
  return obj;
}

document.addEventListener("submit", function(e){
  const form = e.target;

  if (
    form.id !== "quoteFormModal" &&
    form.id !== "nativeQuoteForm"
  ) return;

  e.preventDefault();

  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const data = serializeForm(form);

  fetch(GSHEET_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" }
  })
  .then(r => r.json())
  .then(res => {
    if(res.status === "ok"){
      window.location.href = "/thanks.html";
    } else {
      alert("Submit failed. Please try again.");
    }
  })
  .catch(err => {
    console.error("Submit error:", err);
    alert("Network error. Please try again.");
  });
});

