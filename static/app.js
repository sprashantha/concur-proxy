/***
 * Excerpted from "Node.js the Right Way",
 * published by The Pragmatic Bookshelf.
 * Copyrights apply to this code. It may not be used to create training material, 
 * courses, books, articles, and the like. Contact us if you are in doubt.
 * We make no guarantees that this code is fit for any purpose. 
 * Visit http://www.pragmaticprogrammer.com/titles/jwnode for more book information.
***/
/**
 * app.js
 */
(function(){

var
  
  templates = {},
  
  reports,
  
  getReports = function() {
    $.ajax({
      url: '/concur/api/reports'
    })
    .then(function(data, status, xhr) {
      reports = data;
      showReports();
    }, function(xhr, status, err) {
      if (xhr.status >= 500) {
        showErr(xhr, status, err);
      }
      reports = {};
      showReports();
    });
  },
  
  
  showErr = function(xhr, status, err) {
    $('.alert-danger').fadeIn().find('.message').text(err);
  },
  
  showView = function(selected) {
    window.location.hash = '#' + selected;
    $('.view').hide().filter('#' + selected + '-view').show();
  },
  
  showReports = function() {
    showView('list-reports');
    $('.reports').html(templates['list-reports']({ reports: reports }));
  },

// setup handlebars templates
$('script[type="text/x-handlebars-template"]').each(function() {
  var name = this.id.replace(/-template$/, '');
  templates[name] = Handlebars.compile($(this).html());
});

$(window).on('hashchange', function(event){
  var view = (window.location.hash || '').replace(/^#/, '');
  if ($('#' + view + '-view').length) {
    showView(view);
  }
});

})();
