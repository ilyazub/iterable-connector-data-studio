
/**
 * Mandatory function required by Google Data Studio that should
 * return the authentication method required by the connector
 * to authorize the third-party service.
 * @return {Object} AuthType
 */
function getAuthType() {
  var cc = DataStudioApp.createCommunityConnector();
  return cc.newAuthTypeResponse()
    .setAuthType(cc.AuthType.KEY)
    .setHelpUrl('https://support.iterable.com/hc/en-us/articles/360043464871-API-Keys-')
    .build();
}

/**
 * Mandatory function required by Google Data Studio that should
 * clear user credentials for the third-party service.
 * This function does not accept any arguments and
 * the response is empty.
 */
function resetAuth() {
  var userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('dscc.key');
}

/**
 * Mandatory function required by Google Data Studio that should
 * determine if the authentication for the third-party service is valid.
 * @return {Boolean}
 */
function isAuthValid() {
  var userProperties = PropertiesService.getUserProperties();
  var key = userProperties.getProperty('dscc.key');

  Logger.log(`API Key: ${key}`);

  return key !== null;
}

/**
 * Mandatory function required by Google Data Studio that should
 * set the credentials after the user enters either their
 * credential information on the community connector configuration page.
 * @param {Object} request The set credentials request.
 * @return {object} An object with an errorCode.
 */
function setCredentials(request) {
  var key = request.key;
  var validKey = validateKey(key);

  if (!validKey) {
    return {
      errorCode: 'INVALID_CREDENTIALS'
    };
  }

  var userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('dscc.key', key);

  return {
    errorCode: 'NONE'
  };
}

/**
 * Checks if the Key/Token provided by the user is valid
 * @param {String} key
 * @return {Boolean}
 */
function validateKey(key) {
  Logger.log(`Api Key: ${key}`);

  var baseURL = 'https://api.iterable.com/api/channels';
  var params = {
    'headers': {
      'api-key': key,
      'Accept': 'application/json',
    },
    'muteHttpExceptions': true,
  };

  var response = UrlFetchApp.fetch(baseURL, params);

  Logger.log(`Response code: ${response.getResponseCode()}`);

  if (response.getResponseCode() == 200) {
    return true;
  } else {
    return false;
  }
}

/**
 * Checks if current user can see debug logs.
 */
function isUserAdmin() {
  return false;
}