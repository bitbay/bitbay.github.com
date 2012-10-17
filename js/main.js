/**
 * Box Upload Application
 * 
 * Requires jQuery and Twitter Bootstrap
 * 
 * @author daniel@bitbay.org
 * 
 * See:
 *  http://developers.blog.box.com/2011/09/28/using-the-box-api-with-javascript/
 *  https://github.com/box/box-javascript-sdk/blob/master/js/boxApi.js
 *  http://www.html5rocks.com/en/tutorials/file/dndfiles/
 */

// declaring module of the application, used to not pollute global space
var CSC1836 = ( function() {
		// defines error messages used/known by the errorHandler function
		var errors = {
			NO_SUPPORT : 'The File APIs are not fully supported in this browser.'
		};
		
		/* PRIVATE METHODS */
		
		/**
		 * Global error handler.
		 * 
		 * Supresses known errors, passes on unknown errors
		 * to default browser error handling.
		 * 
		 * @param {String} message of error
		 * @param {Srting} url of the offending script
		 * @param {Number} line of error
		 * 
		 * @return {Boolean} true for handled errors 
		 */
		function errorHandler(msg, url, line){
			// strip added string
			var error = msg.replace("Uncaught ","");
			switch(error){
				case errors.NO_SUPPORT:
				case BoxApi.errors.NO_TICKET:
				case BoxApi.errors.REST_FAIL:
					// handle 'could not get ticket' error
					console.log("CSC1836 [error]: " + error);
					break;
				default:
					// application can not handle error...
					// send to browser.
					return false;
			}
			
			// hide content, show error
			$('#content').addClass('hidden');
			$('#alert').removeClass('hidden');
			$('#alert span').text(error);
			
			// no browser error handling
			return true;
		};
		
		/**
		 * check for needed File API support of browser
		 *
		 * @return {boolean} result of feature detection
		 */
		function checkSupport() {
			return (window.File && window.FileReader && window.FileList && window.Blob);
		};
		
		/**
		 * Prepares files to send.
		 * 
		 * @param {event} change event from file input
		 */
		function handleFileSelect(event){
			// FileList object
			var files = event.target.files;
			
			// push file list to BoxApi	
			BoxApi.putFiles(files);

			// files is a FileList of File objects. List some properties.
			var output = [];
			for (var i = 0, f; f = files[i]; i++) {
				output.push('<li><i class="icon-upload"></i><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ', f.size, ' bytes', '</li>');
			}
			$('#list').html('<ul>' + output.join('') + '</ul>'); 
		};

		/* PUBLIC METHODS */
		
		/**
		 *  Form redirect, trapping event...
		 */
		function submitTrap(event) {
			return CSC1836.submitForm(event);
		};
		
		/**
		 * Send file to server.
		 */
		function submitForm(event) {
			// stop browser default event handlers (auto-redirect)
			event.preventDefault();
			event.stopPropagation();

			console.log("sending");
			$('form').unbind( 'submit', CSC1836.submitTrap );
			BoxApi.uploadFilesToFolder('csc1836', function(){
				console.log("finished uploading");
			});
			return false;
		};
		
		/**
		 * Redirect user to box.net login to get a ticket.
		 */
		function redirect() {
			BoxApi.getTicket(function(response){
				// we got a ticket...
				BoxApi.login();
			});
		};
		
		/* MAIN */
		
		function run(){
			// Check for the various File API support.
			if (!checkSupport()) throw(errors.NO_SUPPORT);
			
			// hide the loading message.
			$('#loading').hide();
			
			// first check if user has a session/ticket
			if( !BoxApi.checkSession() ){
				// insufficient authorization, put login-redirect...
				$('#redirect').removeClass('hidden');
			} else {
				// trap the send event - stop page reload on submit			
				$('form').bind( 'submit', CSC1836.submitTrap );
				
				// handle file selection changes
				$('#files').change(handleFileSelect);
				
				// show form
				$('#fileform').removeClass('hidden');
			}
		};
		
		/* Expose public methods and variables */
		return {
			errorHandler: errorHandler,
			run: run,
			submitForm: submitForm,
			submitTrap: submitTrap, 
			redirect: redirect
		};
	}(jQuery));

// bootstrap the application
$(window).load(function() {
	// trap browser error handler and redirect to app errorHandler
	window.onerror = CSC1836.errorHandler;
	
	// run the application
	CSC1836.run();
});
//http://query.yahooapis.com/v1/public/yql?q=select * from xml where url = 'https://www.box.net/api/1.0/rest?action=get_ticket&api_key=catpk1b0k1w05moxmwnuzdrox9e8n49f'&format=json&diagnostics=true