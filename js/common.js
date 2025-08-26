<script>
// --- begin absolute footer URLs patch ---
(function enforceAbsoluteFooterLinks(){
  function apply() {
    var root = 'https://spellrightpro.org';
    var footer = document.querySelector('footer');
    if (!footer) return;

    var map = {
      'terms':        root + '/terms.html',
      'privacy':      root + '/privacy.html',
      'refund-policy':root + '/refund-policy.html',
      'contact':      root + '/contact.html'
    };

    footer.querySelectorAll('a[href]').forEach(function(a){
      var href = a.getAttribute('href') || '';
      // Match /terms, /privacy, /refund-policy, /contact or their .html forms
      if (/^\/?terms(\.html)?$/i.test(href))            a.href = map['terms'];
      else if (/^\/?privacy(\.html)?$/i.test(href))     a.href = map['privacy'];
      else if (/^\/?refund-?policy(\.html)?$/i.test(href)) a.href = map['refund-policy'];
      else if (/^\/?contact(\.html)?$/i.test(href))     a.href = map['contact'];
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
</script>
