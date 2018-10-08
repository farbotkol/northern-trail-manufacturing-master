let nforce = require('nforce');
let faye = require('faye');
let express = require('express');
let cors = require('cors');
let app = express();
let server = require('http').Server(app);
let io = require('socket.io')(server);

let getOpenCases = (req, res) => {
    let q = "SELECT Id, CaseNumber, Subject, Status  FROM Case WHERE Status !='Closed'";
    org.query({query: q}, (err, resp) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        } else {
            let cases = resp.records;
            let prettyCases = [];
            cases.forEach(singlecase => {
                prettyCases.push({
                    caseId: singlecase.get("Id"),
                    caseSubject: singlecase.get("Subject"),
                    caseNumber: singlecase.get("CaseNumber"),
                    caseStatus: singlecase.get("Status")
                });
            });
            res.json(prettyCases);
        }
    });

};



let approveMix = (req, res) => {
    let mixId = req.params.mixId;
    let event = nforce.createSObject('Mix_Approved__e');
    event.set('Mix_Id__c', mixId);
    event.set('Confirmation_Number__c', 'xyz123');
    org.insert({sobject: event}, err => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
        } else {
            res.sendStatus(200);
        }
    });
}

let closeCase = (req, res) => {
    let caseId = req.params.caseId;
    let event = nforce.createSObject('Close_Case__e');
    event.set('CaseId__c', caseId);
    org.insert({sobject: event}, err => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
        } else {
            res.sendStatus(200);
        }
    });
}

let PORT = process.env.PORT || 3000;

app.use(cors());
app.use('/', express.static(__dirname + '/www'));
app.get('/Cases', getOpenCases);
//app.get('/mixes/:mixId', getMixDetails);
app.post('/closeCase/:caseId', closeCase);


let bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});
bayeux.attach(server);
bayeux.on('disconnect', function(clientId) {
    console.log('Bayeux server disconnect');
});

server.listen(PORT, () => console.log(`Express server listening on ${ PORT }`));

// Connect to Salesforce
let SF_CLIENT_ID = '3MVG9d8..z.hDcPL02a_cf6SoQ8vjkm60fWQzqCbvqdpFgc0winksdNnnUfRfzL3rJ6f8MGx6603j.3dhlM6k';
let SF_CLIENT_SECRET = '5399348578143828655';
let SF_USER_NAME = 'lfarbotko@gmail.com.imp';
let SF_USER_PASSWORD = 'Cloud007777ox8dj4WuPvoebwfB5atNeaOmK';

let org = nforce.createConnection({
    clientId: SF_CLIENT_ID,
    clientSecret: SF_CLIENT_SECRET,
    environment: "production",
    redirectUri: 'http://localhost:3000/oauth/_callback',
    mode: 'single',
    autoRefresh: true
});

org.authenticate({username: SF_USER_NAME, password: SF_USER_PASSWORD}, err => {
    if (err) {
        console.error("Salesforce authentication error");
        console.error(err);
    } else {
        console.log("Salesforce authentication successful");
        console.log(org.oauth.instance_url);
        subscribeToPlatformEvents();
    }
});

// Subscribe to Platform Events
let subscribeToPlatformEvents = () => {
    console.log("Subscribing");
    var client = new faye.Client(org.oauth.instance_url + '/cometd/41.0/');
    client.setHeader('Authorization', 'OAuth ' + org.oauth.access_token);
    var subs = client.subscribe('/event/imp_accelerometer__e', function(message) {
        console.log("Just go a message from imp_accelerometer__e");

        console.log("device: " + message.payload.deviceId__c + 
                    ' time: ' +   message.payload.ts__c + 
                    ' X: ' +  message.payload.x__c + 
                    ' Y: ' +  message.payload.y__c + 
                    ' Z: ' +  message.payload.z__c );
        // Send message to all connected Socket.io clients
        io.of('/').emit('imp_accelerometer_recieved', {
            deviceId: message.payload.deviceId__c,
            ts: message.payload.ts__c,
            x: message.payload.x__c,
            y: message.payload.y__c,
            z: message.payload.z__c
            
        });
    });

    var caseClosed = client.subscribe('/event/Case_Closed__e', function(message) {
        console.log("Just go a message from Case_Closed__e");

        console.log("message: " + message.payload.caseId__c);
        // Send message to all connected Socket.io clients
        io.of('/').emit('case_closed_recieved', {
            caseId: message.payload.caseId__c
        });
    });

    var caseCreated = client.subscribe('/event/Case_Created__e', function(message) {
        console.log("Just go a message from Case_Created__e");

        console.log("message: " + message.payload.CaseId__c);

        let  prettyCase = {
            caseId: message.payload.CaseId__c,
            caseSubject: message.payload.Subject__c,
            caseNumber: message.payload.CaseNumber__c,
            caseStatus: message.payload.Status__c}

        // Send message to all connected Socket.io clients
        io.of('/').emit('case_created_recieved', {
           newcase: prettyCase
        });
    });
    
};