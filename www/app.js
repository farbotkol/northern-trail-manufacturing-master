var content = document.getElementById('content');
var accelerometer = document.getElementById('accelerometer');
var cases;


function renderAccelerometer(data) {
    var html = '';
    

    html = html + '<div>Devie Id: ' +  data.deviceId + ' </div>';
    html = html + '<div>Time: ' +  data.ts + ' </div>';
    html = html + '<div>X: ' +  data.x + ' </div>';
    html = html + '<div>Y: ' +  data.y + '  </div>';
    html = html + '<div>Z: ' +  data.z + '  </div>';
    
    accelerometer.innerHTML = html;

    if( data.y < -0.50) {
        console.log("RIGHT"); 
        lonDirection = .1;
    }
    if( data.x < -0.50) {
        //agent.send("direction.sent", "BACK"); 
        console.log("BACK");
        latDirection = .1;
    }
    if( data.y > 0.50) {
        console.log("LEFT"); 
        lonDirection = -.1
    }
    if( data.x > 0.50) {
        //agent.send("direction.sent", "FORWARD"); 
        console.log("FORWARD");
        latDirection = -.1;
    }
     if(  data.y < 0.50 &&  data.y > -0.50) {
        console.log("Y CENTRE");
        //agent.send("direction.sent", "CENTRE"); 
        lonDirection = 0; 
    }
    if (data.x < 0.50 &&  data.x > -0.50 ){
        console.log("X CENTRE");
        latDirection = 0;
    }
    
}

function renderCases() {
    var html = '';
    cases.forEach(function(cs) {
        html = html + '<div class="row">' + renderCase(cs) + '</div>';
    });
    content.innerHTML = html;
}

function renderCase(cs, isAnimated) {
    return `
        <div class="col-sm-12">
            <div class="panel panel-primary ${isAnimated?"animateIn":""}">
                <div class="panel-heading">Case SFID: ${cs.caseId}</div>
                <div class="panel-body">
                    <div class="col-md-12 col-lg-7">
                        <table>
                            <tr>
                                <td class="panel-table-label">Case Number:</td><td>${cs.caseNumber}</td>
                            </tr>
                            <tr>
                                <td class="panel-table-label">Subject:</td><td>${cs.caseSubject}</td>
                            </tr>
                            <tr>
                            <td class="panel-table-label">Status:</td><td>${cs.caseStatus}</td>
                        </tr>
                        </table>
                    </div>   
                    <div class="col-md-12 col-lg-5">
                        <button class="btn btn-info" onclick="closeCase('${cs.caseId}')">
                            <span class="glyphicon glyphicon-ok" aria-hidden="true"></span>
                            Close
                        </button>
                    </div>
                    <div id="details-${cs.caseId}" class="col-md-12"></div>
                </div>
            </div>
        </div>`;
}

// Render the merchandise list for a mix
function renderMixDetails(mix, items) {
    var html = `
        <table class="table">
            <tr>
                <th colspan="2">Product</th>
                <th>MSRP</th>
                <th>Qty</th>
            </tr>`;
    items.forEach(function(item) {
        html = html + `
            <tr>
                <td><img src="${item.pictureURL}" style="height:50px"/></td>
                <td>${item.productName}</td>
                <td>$${item.price}</td>
                <td>${item.qty}</td>
            </tr>`
    });
    html = html + "</table>"    
    var details = document.getElementById('details-' + mix.mixId);
    details.innerHTML = html;
}

function deleteCase(caseId) {
    var index = cases.length - 1;
    while (index >= 0) {
        if (cases[index].caseId === caseId) {
            cases.splice(index, 1);
        }
        index -= 1;
    }
}

var socket = io.connect();

socket.on('case_closed_recievedXXX', function (newMix) {
    // if the mix is alresdy in the list: do nothing
    var exists = false;
    mixes.forEach((mix) => {
        if (mix.mixId == newMix.mixId) {
            exists = true;
        }
    });
    // if the mix is not in the list: add it
    if (!exists) {
        mixes.push(newMix);
        var el = document.createElement("div");
        el.className = "row";
        el.innerHTML = renderMix(newMix, true);
        content.insertBefore(el, content.firstChild);
    }
});

socket.on('case_closed_recieved', function (data) {
    console.log('case_closed_recieved');
    
    deleteCase(data.caseId);
    renderCases();
});


socket.on('imp_accelerometer_recieved', function (data) {
    console.log('imp_accelerometer_recieved');
    
    accX +=  data.x;
    accY +=  data.y;
    renderAccelerometer(data);
});



socket.on('case_created_recieved', function (data) {
    console.log('case_created_recieved: ' + data.newcase.caseId );
    var exists = false;
    cases.forEach((case1) => {
        if (case1.caseId == data.newcase.caseId ) {
            exists = true;
        }
    });
    // if the mix is not in the list: add it
    if (!exists) {
        cases.push(data.newcase);
        var el = document.createElement("div");
        el.className = "row";
        el.innerHTML = renderCase(data.newcase, true);
        content.insertBefore(el, content.firstChild);
    }
    
});

// Retrieve the existing list of mixes from Node server
function getCaseList() {
    var xhr = new XMLHttpRequest(),
        method = 'GET',
        url = '/cases';

    xhr.open(method, url, true);
    xhr.onload = function () {
        cases = JSON.parse(xhr.responseText);
        renderCases();
    };
    xhr.send();
}

// Retrieve the merchandise list for a mix from Node server
function getMixDetails(mixId) {
    var details = document.getElementById('details-' + mixId);
    if (details.innerHTML != '') {
        details.innerHTML = '';
        return;
    }
    var mix;
    for (var i=0; i<mixes.length; i++) {
        if (mixes[i].mixId = mixId) {
            mix = mixes[i];
            break;
        }
    };
    var xhr = new XMLHttpRequest(),
        method = 'GET',
        url = '/mixes/' + mixId;

    xhr.open(method, url, true);
    xhr.onload = function () {
        var items = JSON.parse(xhr.responseText);
        renderMixDetails(mix, items);
    };
    xhr.send();
}

// Post approve message to Node server
function closeCase(caseId) {
    var xhr = new XMLHttpRequest(),
        method = 'POST',
        url = '/closeCase/' + caseId;

    xhr.open(method, url, true);
    xhr.onload = function () {
        //deleteMix(mixId);
        //renderMixList();
    };
    xhr.send();
    
}

getCaseList();
//renderAccelerometer();