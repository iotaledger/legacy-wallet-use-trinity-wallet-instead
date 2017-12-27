const __entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': '&quot;',
  "'": '&#39;',
  "/": '&#x2F;'
};

const escapeHTML = (text) => {
  return new String(text || "").replace(/[&<>"'\/]/g, function(s) {
    return __entityMap[s];
  });
}

module.exports = escapeHTML;