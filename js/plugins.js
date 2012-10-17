// Avoid `console` errors in browsers that lack a console.
( function() {
		var noop = function noop() {
		};
		var methods = ['assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error', 'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log', 'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd', 'timeStamp', 'trace', 'warn'];
		var length = methods.length;
		var console = window.console || {};

		while (length--) {
			// Only stub undefined methods.
			console[methods[length]] = console[methods[length]] || noop;
		}
	}());

// Place any jQuery/helper plugins in here.

/**
 * BoxApi
 *
 * Helper class to communicate with the Box REST services
 *
 * Loosely based on official javascript SDK API
 * https://github.com/box/box-javascript-sdk/blob/master/js/boxApi.js
 *
 */
var BoxApi = (function($) {
	/* SETTINGS FOR THE PLUGIN */
	
	var boxApi = {
		/* CONSTANTS */
		
		// change this to Your api key of box.com application
		//apiKey: 'catpk1b0k1w05moxmwnuzdrox9e8n49f', // csc1836
		apiKey: '19s1uafuwitjlquh2qgarqgpkmg1091o', // csc1842
		
		// name of the default folder to upload files to
		defaultUploadFolder: 'csc1836',
		
		/**
		 * base for the queries submitted - url encoded
		 *
		 * this plugin uses the YQL to bypass cross-domain restrictions
		 * using public (csc1836) YQL query aliases, helps to 
		 * "prettify" urls in this app
		 * 
		 * the "boxapi" query alias is:
		 * 		select * from xml where url=@url
		 * 
		 * @see http://developer.yahoo.com/yql/guide/yql_url.html#yql-query-aliases
		 */
		yqlAlias: "http://query.yahooapis.com/v1/public/yql/csc1836/boxapi?url=",
		
		// box api to use, version 1.0 for now...
		boxRestUrl: "https://www.box.net/api/1.0/",
		// sadly formData can't be sent over the YQL since all passed parameters
		// must be querystrings...
		boxPostUrl: "https://upload.box.net/api/1.0/upload/",
		
		/* SETTING VARIABLES */
		/* will be populated by querying the redirected URL from
		 * a successful login on box.net
		 */
		
		// the authorization token recieved, used/required in
		// all API calls to box.com
		auth_token: '',
		ticket: '',
		
		// error messages used by the module
		errors: {
			NO_TICKET: 'Could not get ticket',
			REST_FAIL: 'There was a problem communicating with the server'
		}
	};
	
	
	/* CONSTRUCTOR */
	
	// setup $.ajax for type data and content for all the ajax requests*
	// * execpt for the upload POST
	$.ajaxSetup({
  		dataType : 'jsonp',
		contentType : "application/json; charset=utf-8"
	});
	
	
	/* PRIVATE METHODS */
	
	/**
	 * URL to REST API for current session
	 * 
	 * @param {String} action to call on server(server api constant)
	 * @param {String} additional parameters to pass to server
	 */
	function restApi(action, moreParams) {
		return boxApi.yqlAlias + 
			escape(	boxApi.boxRestUrl +
					"rest?action=" + action +
					"&api_key=" + boxApi.apiKey +
					(boxApi.authToken ? "&auth_token=" + boxApi.authToken : "") + 
					(moreParams ? "&" + moreParams : "")
			) + "&format=json&diagnostics=true";
	};
	
	/**
	 * Url to which to upload files
	 *
	 * If no valid folder is provided, root is assumed
	 * 
	 * @param {String} name of the folder to upload to (default value set
	 * 	in BoxApi settings object)
	 * @return {String} full URL of the target folder
	 */
	function uploadUrl(folder) {
		// Folder exists (@id), just created (folder_id), or root (0)
		var folderId = folder['@id'] || folder['folder_id'] || '0';
		/*
		return boxApi.yqlAlias + 
			escape(	boxApi.boxPostUrl  +
					boxApi.auth_token +
					"/" + folderId
			) + "&format=json&diagnostics=true";
			*/
		return boxApi.boxPostUrl + boxApi.auth_token + "/" + folderId;
		//return "https://upload.box.net/api/2.0/upload/" + folderId;
	}
	/*
	function uploadUrl(folder) {
		// Folder exists (@id), just created (folder_id), or root (0)
		var folderId = folder['@id'] || folder['folder_id'] || '0';
		
		return boxApi.testAlias + "url=" + boxApi.boxPostUrl +
			"&auth_key=" + boxApi.auth_token +
					"&folder=" + folderId
			+ "&format=json&diagnostics=true";
		//return boxApi.urlUp + boxApi.apiKey + "/" + folderId + "'&format=json&diagnostics=true";
		//return "https://upload.box.net/api/1.0/upload/" + boxApi.auth_token + "/" + folderId;
		//return "https://upload.box.net/api/2.0/upload/" + folderId;
	}*/
	/**
	 * Search for an existing folder on the users account (box.com)
	 * 
	 * @param {String} folder name to search
	 * @param {function} callback to call with result folder || null
	 */
	function lookupFolder(name, callback) {
		// API URL of the method "get_account_tree"
		var url = restApi("get_account_tree", "auth_token=" + boxApi.auth_token + 
			"&folder_id=0&params[]=nofiles&params[]=nozip&params[]=onelevel"
		);
		
		// calling the API method
		$.ajax({
			url: url,
			success: function(data, textStatus, jqXHR){
				// check if got a useful response
				try{
					var tree = data.query.results.response.tree;
				} catch(error){
					throw boxApi.errors.REST_FAIL;
				};
				
				// tree.folder = root id = 0
				tree.root = tree.folder;
	
				if (!tree.root.folders) {
					// No folders in root!
					return callback(null);
				}
	
				// Force an array if there is only one child of the root folder
				if (!tree.root.folders.folder.length) {
					tree.root.folders.folder = [tree.root.folders.folder];
				}
	
				// select where folder.name == name
				var foldersLen = tree.root.folders.folder.length;
				for (var f = 0; f < foldersLen; f += 1) {
					var folder = tree.root.folders.folder[f];
					if (folder['@name'] == name) {
						return callback(folder);
					}
				}
				
				return callback(null);
			},
			error: function(jqXHR, textStatus, errorThrown){
				// something went wrong
				throw boxApi.errors.REST_FAIL;
			}
		});
	};
	
	/**
	 * Create a folder
	 * 
	 * @param {String} desired name for the folder
	 * @param {function} callback to call with folder result
	 */
	function createFolder(name, callback) {
		// encode the name of folder for URL transfer
		var urlSafeName = encodeURIComponent(name);
		
		// API URL of the method "create_folder"
		var url = restApi("create_folder",
			"auth_token=" + boxApi.auth_token +
			"&parent_id=0&share=0&name=" + urlSafeName);
			
		// calling the API method
		$.ajax({
			url: url,
			success: function(data, textStatus, jqXHR){
				// check if got a useful response
				try{
					var folder = data.query.results.response.folder;
				}catch(error){
					throw boxApi.errors.REST_FAIL;
				}
	
				callback(folder);
			},
			error: function(jqXHR, textStatus, errorThrown){
				// something went wrong
				throw boxApi.errors.REST_FAIL;
			}
		});
	};

	/**
	 * Find folder or create it, then send it to the callback method
	 * 
	 * @param {String} desired name for the folder
	 * @param {function} callback to call with folder result
	 */
	function getOrCreateFolder(name, callback) {
		// find the folder with "name"
		lookupFolder(name, function(folder) {
			if (folder == null) {
				// if no folder found, create it
				createFolder(name, callback);
				return;
			}
			
			// if folder found, send it to the callback
			callback(folder);
		});
	};


	/* PUBLIC METHODS */

	/**
	 * Check if login needed, based on presence of token/ticket..
	 * TODO: use cookies to store got-last-ticket-DATE, to see if
	 * 	is still valid (issued tickets are valid for 10 minutes)
	 * 
	 * @return {boolean} authorized?
	 */
	function checkSession(){
		var hash;
		//checking based on querystrings...
		var q = document.URL.split('?')[1];
		
		if (q != undefined) {
			// query found, should be set by box.net/api...
			q = q.split('&');
			for (var i = 0; i < q.length; i++) {
				hash = q[i].split('=');
				switch(hash[0]){
					case 'auth_token':
						boxApi.auth_token = hash[1];
						break;
					case 'ticket':
						boxApi.ticket = hash[1];
						break;
					default:
						// just interested in auth_token and ticket...
						break;
				}
			}
		};
		
		// check based on previously set variables...
		if( boxApi.auth_token === '' || boxApi.ticket === ''){
			return false;
		}else{
			return true;
		}
	};
	
	/**
	 * Use YQL to get a valid ticket for www.box.net,
	 * redirects user to sign in on box network.
	 *
	 * @param {function} callback to call on response
	 * @return
	 */
	function getTicket(callback){
		// calling the API method
		$.ajax({
			url: restApi('get_ticket'),
			success: function(data, textStatus, jqXHR){
				// see if result is a ticket...
				try{
					// set boxApi.ticket
					boxApi.ticket = data.query.results.response.ticket;
				}catch(error){
					throw boxApi.errors.NO_TICKET;
				}
				
				callback();
			},
			error: function(jqXHR, textStatus, errorThrown){
				// something went wrong
				throw boxApi.errors.NO_TICKET;
			}
		});
	};
	
	/**
	 * Redirects browser to login URL 
	 */
	function redirectToAuth(){
		window.location.href = 'https://m.box.net/api/1.0/auth/' + boxApi.ticket;
	};

	/**
	 * Saves reference of files into settings
	 * 
	 * @param {FileList} the files to upload
	 */
	function putFiles(files){
		boxApi.files = files;
	};
	/**
	 * Uploads a collection of DOM File objects, then calls the
	 * ...callback with the info of the uploaded files as input
	 */
	function postFiles(files, folder, callback) {
		if (!files)
			return;
		
		// reference to the form 
		var form = $('#fileform>form');
		
		// get the url of the folder to post the file
		var action_url = uploadUrl(folder);
		
		// get element representing file to be uploaded
		//var file_input = $('#files');
		
		// Create the iframe...
		var iframe = $('<iframe id="upload_iframe" name="upload_iframe" style="display:hidden;"/>');
		
		// set attributes - "invisible"
	    $(iframe).attr("id", "upload_iframe")
	    	.attr("name", "upload_iframe")
	    	.attr("width", "0")
	    	.attr("height", "0")
	    	.attr("border", "0")
	    	.attr("style", "width: 0; height: 0; border: none;");
	    
	    /*
		var iframe_form = $('<form method="post" enctype="multipart/form-data"'+
				'action="' + url + '">');
		
		iframe_form.append(file_input);
		*/
		// Add to document...
	    $(form).parent().append(iframe);
		window.frames['upload_iframe'].name = "upload_iframe";
		//iframeId = document.getElementById("upload_iframe");

		// Add event...
		var eventHandler = function () {
			$(iframe).unbind('load', eventHandler);
			//var content = $(iframe).contents().find('body').innerHTML();
			
            //document.getElementById(div_id).innerHTML = content;
 
            // Del the iframe...
			$('#fileform').remove(iframe);//setTimeout('iframeId.parentNode.removeChild(iframeId)', 30);
        };
		
		$(iframe).bind('load', eventHandler);
		//    if (iframeId.addEventListener) iframeId.addEventListener("load", eventHandler, true);
		//    if (iframeId.attachEvent) iframeId.attachEvent("onload", eventHandler);
		
		
	    // Set properties of form...
	    $(form).attr("target", "upload_iframe");
	    $(form).attr("action", action_url);
	    $(form).attr("method", "post");
	    $(form).attr("enctype", "multipart/form-data");
	    $(form).attr("encoding", "multipart/form-data");
	 
	    // Submit the form...
	    $(form).submit();
	};
	
	/**
	 * Uploads previously pushed files (boxApi.files) to folder
	 * 
	 * @param {String} desired folder name
	 * @param {function} callback to call on finish
	 */
	function uploadFilesToFolder(folderName, callback) {
		// No folder requested, just upload into root
		if (!folderName) {
			postFiles(files, {}, callback);
			return;
		}

		getOrCreateFolder(folderName, function(folder) {
			postFiles(boxApi.files, folder, callback);
		});
	};

	/* Public methods exposed for Box API */
	return {
		errors: boxApi.errors,
		checkSession: checkSession,
		getTicket : getTicket,
		login: redirectToAuth,
		putFiles: putFiles,
		uploadFilesToFolder : uploadFilesToFolder
	};
})(jQuery);
