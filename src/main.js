var cc = DataStudioApp.createCommunityConnector();
var DEFAULT_CAMPAIGNS = '3642929,3638831'

function getConfig() {
  var config = cc.getConfig();

  config.newInfo()
    .setId('instructions')
    .setText('Enter campaign IDs to fetch their metrics.');

  config.newTextInput()
    .setId('id')
    .setName('Enter a Iterable campaign ID')
    .setHelpText('e.g. 7474747')
    .setPlaceholder(DEFAULT_CAMPAIGNS)
    .setAllowOverride(true);

  config.setDateRangeRequired(true);
  config.setIsSteppedConfig(false);

  return config.build();
}

function getFields() {
  var fields = cc.getFields();
  var types = cc.FieldType;
  var aggregations = cc.AggregationType;

  // Common
  fields.newDimension().setId('id').setName("id").setType(types.TEXT);
  fields.newDimension().setId('AverageOrderValue').setName("Average Order Value").setType(types.NUMBER);
  fields.newDimension().setId('Revenue').setName("Revenue").setType(types.NUMBER);
  fields.newDimension().setId('TotalPurchases').setName("Total Purchases").setType(types.NUMBER);
  fields.newDimension().setId('TotalUnsubscribes').setName("Total Unsubscribes").setType(types.NUMBER);
  fields.newDimension().setId('UniquePurchases').setName("Unique Purchases").setType(types.NUMBER);
  fields.newDimension().setId('UniqueUnsubscribes').setName("Unique Unsubscribes").setType(types.NUMBER);

  // Email
  fields.newDimension().setId('PurchasesMEmail').setName("Purchases / M (Email)").setType(types.NUMBER);
  fields.newDimension().setId('RevenueMEmail').setName("Revenue / M (Email)").setType(types.NUMBER);
  fields.newDimension().setId('TotalComplaints').setName("Total Complaints").setType(types.NUMBER);
  fields.newDimension().setId('TotalEmailHoldout').setName("Total Email Holdout").setType(types.NUMBER);
  fields.newDimension().setId('TotalEmailOpens').setName("Total Email Opens").setType(types.NUMBER);
  fields.newDimension().setId('TotalEmailOpensFiltered').setName("Total Email Opens (filtered)").setType(types.NUMBER);
  fields.newDimension().setId('TotalEmailSendSkips').setName("Total Email Send Skips").setType(types.NUMBER);
  fields.newDimension().setId('TotalEmailSends').setName("Total Email Sends").setType(types.NUMBER);
  fields.newDimension().setId('TotalEmailsBounced').setName("Total Emails Bounced").setType(types.NUMBER);
  fields.newDimension().setId('TotalEmailsClicked').setName("Total Emails Clicked").setType(types.NUMBER);
  fields.newDimension().setId('TotalEmailsDelivered').setName("Total Emails Delivered").setType(types.NUMBER);
  fields.newDimension().setId('TotalHostedUnsubscribeClicks').setName("Total Hosted Unsubscribe Clicks").setType(types.NUMBER);
  fields.newDimension().setId('UniqueEmailClicks').setName("Unique Email Clicks").setType(types.NUMBER);
  fields.newDimension().setId('UniqueEmailOpens').setName("Unique Email Opens").setType(types.NUMBER);
  fields.newDimension().setId('UniqueEmailOpensFiltered').setName("Unique Email Opens (filtered)").setType(types.NUMBER);
  fields.newDimension().setId('UniqueEmailOpensOrClicks').setName("Unique Email Opens Or Clicks").setType(types.NUMBER);
  fields.newDimension().setId('UniqueEmailSends').setName("Unique Email Sends").setType(types.NUMBER);
  fields.newDimension().setId('UniqueEmailsBounced').setName("Unique Emails Bounced").setType(types.NUMBER);
  fields.newDimension().setId('UniqueEmailsDelivered').setName("Unique Emails Delivered").setType(types.NUMBER);
  fields.newDimension().setId('UniqueHostedUnsubscribeClicks').setName("Unique Hosted Unsubscribe Clicks").setType(types.NUMBER);

  // Web Push
  fields.newDimension().setId('TotalWebPushClicks').setName("Total Web Push Clicks").setType(types.NUMBER);
  fields.newDimension().setId('TotalWebPushSendSkips').setName("Total Web Push Send Skips").setType(types.NUMBER);
  fields.newDimension().setId('TotalWebPushesSent').setName("Total Web Pushes Sent").setType(types.NUMBER);
  fields.newDimension().setId('TotalWebPushHoldout').setName("Total WebPush Holdout").setType(types.NUMBER);
  fields.newDimension().setId('UniqueWebPushClicks').setName("Unique Web Push Clicks").setType(types.NUMBER);
  fields.newDimension().setId('UniqueWebPushesSent').setName("Unique Web Pushes Sent").setType(types.NUMBER);

  return fields;
}

function getSchema(request) {
  var fields = getFields(request).build();
  return { schema: fields };
}

function getData(request) {
  request.configParams = validateConfig(request.configParams);

  var requestedFieldIds = request.fields.map(field => field.name);
  var requestedFields = getFields().forIds(requestedFieldIds);

  Logger.log(`Requested fields: ${JSON.stringify(requestedFields)}`);

  var url = 'https://api.iterable.com/api/campaigns/metrics';

  var parameters = {
    campaignId: request.configParams.id,
    startDateTime: request.dateRange.startDate,
    endDateTime: request.dateRange.endDate,
  };

  Logger.log(`Parameters: ${JSON.stringify(parameters)}`);

  var userProperties = PropertiesService.getUserProperties();
  var apiKey = userProperties.getProperty('dscc.key');

  var options = {
    method: 'get',
    headers: {
      'Accept': 'application/json',
      'api-key': apiKey,
    },
  };

  try {
    var urlWithParameters = buildUrl_(url, parameters);
    Logger.log(`URL with parameters: ${urlWithParameters}`);

    var response = UrlFetchApp.fetch(urlWithParameters, options);
    Logger.log(`Response text: ${response.getContentText()}`);

    var rows = responseToRows(requestedFields, response, request.configParams.id);
    Logger.log(`Rows: ${JSON.stringify(rows)}`);

    return {
      schema: requestedFields.build(),
      rows: rows
    };
  } catch (e) {
    cc.newUserError()
      .setDebugText('Failed URL Fetch Attempt. Exception details: ' + e)
      .setText('There was an error accessing this domain. Try again later, or file an issue if this error persists.')
      .throwException();
  }
}

function responseToRows(requestedFields, response, id) {
  var csv = Utilities.parseCsv(response);

  var headers = csv[0]
  var rows = csv.slice(1)

  var fields = requestedFields.asArray();
  Logger.log(`Requested fields: ${JSON.stringify(requestedFields)}. Campaign ID (id): ${id}`);

  return rows.map(function (item) {
    Logger.log(`Item: ${JSON.stringify(item)}`)

    var row = [];

    fields.forEach(function (field) {
      var fieldName = field.getName()
      var fieldId = field.getId()

      var fieldIndex = headers.indexOf(fieldName)

      Logger.log(`Field name: ${fieldName}. Field ID: ${fieldId}. Index: ${fieldIndex}`)

      switch (fieldId) {
        // case 'id':
        //   return row.push(item.id);
        // case 'UniqueUnsubscribes':
        //   return row.push(item);
        default:
          return row.push(item[fieldIndex]);
      }
    });

    return { values: row };
  });
}

/**
 * Builds a complete URL from a base URL and a map of URL parameters.
 * @param {string} url The base URL.
 * @param {Object.<string, string>} params The URL parameters and values.
 * @return {string} The complete URL.
 * @private
 */
function buildUrl_(url, params) {
  var paramString = Object.keys(params).map(function (key) {
    let param = params[key];

    if (Array.isArray(param)) {
      return param.map(value => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
    } else {
      return `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`;
    }
  }).join('&');
  return url + (url.includes('?') ? '&' : '?') + paramString;
}

/**
 * Validates config parameters and provides missing values.
 *
 * @param {Object} configParams Config parameters from `request`.
 * @returns {Object} Updated Config parameters.
 */
 function validateConfig(configParams) {
  configParams = configParams || {};
  configParams.id = configParams.id || DEFAULT_CAMPAIGNS;

  configParams.id = configParams.id
    .split(',')
    .map(x => x.trim());

  return configParams;
}
