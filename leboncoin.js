var request = require('request');
var tress = require('tress');
var cheerio = require('cheerio');
var fs = require('fs');
var csv = require('csv-parser');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    webdriver = require('selenium-webdriver')
	proxy = require('selenium-webdriver/proxy')
    chrome    = require('selenium-webdriver/chrome')
    By        = webdriver.By,
    until     = webdriver.until,
    options   = new chrome.Options();
    options.addArguments("window-size=1680,1050");
	options.addArguments("disable-web-security");
    options.addArguments("allow-running-insecure-content");
	if(process.argv[2] == 'headless'){
	options.addArguments("headless");
	options.addArguments("--disable-gpu");
	}
	options.addArguments("--log-level=3");
	options.addArguments("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36");
    options.setUserPreferences({'download.default_directory': __dirname})
	path = require('chromedriver').path;
    service = new chrome.ServiceBuilder(path).build();
    chrome.setDefaultService(service);
		
	var app = express();
	var failedObj = [];
	var bots_num = 3;

	app.set('port', (process.env.PORT || 5000));

	app.use(bodyParser.json({limit: '50mb'}));
	app.use(bodyParser.urlencoded({limit: '50mb', extended: true }));
	app.use(cookieParser());

	app.post('/run_bots', function(request, response, next) {
		bots_num = request.body.bots
		if(bots_num > 5){
			bots_num = 5
		}
		if(bots_num == null || bots_num == undefined){
			bots_num = 3
		}
		var wt = bots.waiting;
		var ac = bots.active;

		if(wt.length == 0 && ac.length == 0){
			getCsv();
			response.json({'Status':'Success'});
		} else {
			response.json({'Status':'Script is already running'});
		}
		
	});

	if(process.argv[2] !== '1'){
		app.listen(app.get('port'), function() {
		  console.log('Node app is running on port', app.get('port'));
		  console.log(`Send POST request to /run_bots to start it. 
Add <bots> to the request body with number to specify the number of threads (max - 5, default - 3).
Example: {bots: 3}`)
		});
	} else {
		bots_num = 1
		getCsv()
	}
	
	app.use(function(req, res, next) {
	  var err = new Error('Not Found');
	  err.status = 404;
	  next(err);
	});


	// development error handler
	// will print stacktrace
	if (app.get('env') === 'development') {
	  app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.json({
		  message: err.message,
		  error: err
		});
	  });
	}

	// production error handler
	// no stacktraces leaked to user
	app.use(function(err, req, res, next) {
	  res.status(err.status || 500);
	  res.json({
		message: err.message,
		error: {}
	  });
	});
	
function getCsv(){
	
var csvdata = [];


request('https://docs.google.com/spreadsheets/d/e/2PACX-1vRsoT7Jo8-SYg0ywR_2mClONRu8RnwDVKG2YRrBOOAcNY4R_ON5TZYf1YvoEI-sKB925Vp4UQm4EY9A/pub?gid=704994622&single=true&output=csv', function(error, response, body) {
  if (!error && response.statusCode == 200) {
    fs.writeFile('leboncoin.csv', body, {encoding: 'utf-8'}, function(err){
		fs.createReadStream('leboncoin.csv')
		  .pipe(csv({separator: ',',quote: '"',escape: '"',newline: '\n'}))
		  .on('data', function (data) {
			csvdata.push(data);
		  })
		  .on('end', function(){
			//    fs.unlink('leboncoin.csv');
				start(csvdata);
		  })
	})
  } else { console.log(error) }
});

}

var bots = tress(function(data,callback){
	
	var str = data["Titre de l'annonce"];
	
	if(getByValue(failedObj,str) != null){
		if(failedObj[failedObj.indexOf(getByValue(failedObj,str))].attempts > 3) {
			callback()
			return;
		}
	}
	
	console.log(`Starting bot for: ${data["Titre de l'annonce"]}`)
	
	capabilities = webdriver.Capabilities.chrome()
	capabilities.setPageLoadStrategy('none')
	
	var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .withCapabilities(capabilities)
	.setProxy(proxy.manual({http:`205.234.153.91:1035`,https:`205.234.153.91:1035`}))
    .setChromeOptions(options)
    .build();
	
	var imgNum = 1
	var allImages = []
	var errors = 0
	var timeout = 0

	var hangCheck = setInterval(function(){
		
		timeout++
		//console.log(timeout)
		if(timeout >= 120){
			for(var i=0;i<allImages.length;i++){
				if (fs.existsSync(allImages[i])) {
					fs.unlink(allImages[i])
				}
			}
			clearInterval(hangCheck)
			driver.quit()
			callback(true)
		}
			
	},1000)

	
	getImages().then(function(){},function(){errorHandle('getImages',getImages)})
	
async function getImages(){
	
	timeout = 0
	
	await driver.get(data[`Image n°${imgNum}`])
	await domCheck()
	await driver.wait(until.elementIsVisible(driver.findElement({className:'drive-viewer-toolstrip-name'})),30000)
	await driver.findElement({className:'drive-viewer-toolstrip-name'}).getText().then(function(txt){
		allImages.push(txt)
	}).then(function(){
		driver.getCurrentUrl().then(function(lnk){
			lnk = lnk.replace('/view','&export=download').replace('/file/d/','/uc?id=')
			request.get({url: lnk, encoding: 'binary'}, function(err, res){
			  if(!err && res.statusCode == 200){
				fs.writeFile(`${allImages[imgNum - 1]}`, res.body, {encoding:'binary'})
			  } else {
				  console.log(err)
			  }
			  
			  	if(imgNum < 3){
					errors = 0
					imgNum++
					getImages().then(function(){},function(){errorHandle('getImages',getImages)})
				} else {
					errors = 0
					login().then(function(){},function(){errorHandle('login',login)})
				}
			  
			})
		}).catch(function(){
			//
		})
	}).catch(function(err){
		console.log(err)
	})
	
}
	
async function login(){
	
	timeout = 0
	console.log(`Logging in for bot: ${data["Titre de l'annonce"]}`)
	
	await driver.get('https://compteperso.leboncoin.fr/account/index.html?ca=12_s/')
	await domCheck()
	await driver.findElement({name:'st_username'}).sendKeys(data['Login (leboncoin)'])
	await driver.findElement({name:'st_passwd'}).sendKeys(data['Mot de passe (leboncoin)'])
	await driver.findElement({name:'st_username'}).submit()
	await domCheck('complete')
	errors = 0
	next().then(function(){},function(){errorHandle('next',next)})

}

async function next(){
	
	timeout = 0
	
	var res = []
	var cnt = 0
	await driver.sleep(5000)
	var els = await driver.findElements({css:'a'})
	
	nextSub().then(function(){},function(err){console.log(err);nextSub()})
	
	async function nextSub(){
		
		if(cnt !== els.length){
			var txt = await els[cnt].getText()
			if(txt.toLowerCase() == data["Titre de l'annonce"].toLowerCase()){
				next2(els[cnt]).then(function(){},function(){errorHandle('next2',next)})
			} else {
				cnt++
				nextSub().then(function(){},function(err){console.log(err);nextSub()})
			}
		} else {
			next3(true).then(function(){},function(){errorHandle('next3',next3,true)})
		}
		
	}
		
}

async function next2(el){
	
	timeout = 0

	await el.click()
	await domCheck()
	await driver.wait(until.elementLocated(By.css('a[data-qa-id="adview_manager_delete"]')),20000)
	await driver.findElement({css:'a[data-qa-id="adview_manager_delete"]'}).click()
	await domCheck()
	await driver.findElement({name:'delete_reason'}).click()
	await driver.findElement({xpath:'//option[text()[contains(.,"Autre")]]'}).click()
	await driver.findElement({name:'delete_reason'}).submit()
	await domCheck('complete')
	await driver.sleep(5000)
	await driver.get('https://compteperso.leboncoin.fr/account/index.html?ca=12_s')
	await domCheck()
	await driver.findElement({id:'account_logout'}).click()
	await domCheck()
	await driver.sleep(1500)
	errors = 0
	next3().then(function(){},function(err){console.log(err);errorHandle('next3',next3,true)})

}

async function next3(pass_login){
	
	timeout = 0
	
	if(pass_login !== true){
		await driver.get('https://compteperso.leboncoin.fr/account/index.html?ca=12_s/')
		await domCheck()
		await driver.findElement({name:'st_username'}).sendKeys(data['Login (leboncoin)'])
		await driver.findElement({name:'st_passwd'}).sendKeys(data['Mot de passe (leboncoin)'])
		await driver.findElement({name:'st_username'}).submit()
		await domCheck()
	}
	await domCheck('complete')
	await driver.findElement({className:'deposer'}).click()
	await domCheck()
	await driver.findElement({id:'category'}).click()
	await driver.wait(until.elementIsVisible(driver.findElement({id:'cat12'})),15000)
	await driver.findElement({id:'cat12'}).click()
	await driver.findElement({id:'subject'}).sendKeys(data["Titre de l'annonce"])
	await driver.wait(until.elementIsVisible(driver.findElement({id:'capacity'})),30000)
	await driver.findElement({id:'capacity'}).sendKeys(data["Nombre de personnes MAX"])
	await driver.findElement({id:'swimming_pool'}).click()
	await driver.wait(until.elementIsVisible(driver.findElement({xpath:'.//*[@id="swimming_pool"]/option[1]'})),150000)
	await driver.findElement({xpath:'.//*[@id="swimming_pool"]/option[1]'}).click()
	await driver.findElement({id:'bedrooms'}).sendKeys(data["Nombre de chambres"])
	await driver.findElement({id:'price_min'}).sendKeys(data["Prix minimum / semaine"])
	await driver.findElement({id:'price_max'}).sendKeys(data["Prix maximum / semaine"])
	var el = await driver.findElement({id:'energy_rate'})
	var res = await el.isDisplayed()
	if(res){
		await el.click()
		await driver.findElement({xpath:'//option[text()[contains(.,"A (moins de 50)"]]'}).click()
	}
	el = await driver.findElement({id:'ges'})
	res = await el.isDisplayed()
	if(res){
		await el.click()
		await driver.findElement({xpath:'//option[text()[contains(.,"A (moins de 5)"]]'}).click()
	}
	await driver.findElement({id:'body'}).sendKeys(data["Texte de l'annonce"])
	await driver.findElement({id:'location_p'}).sendKeys(data["Code postal"])
	await driver.wait(until.elementLocated(By.xpath("//ul[@class='location-list visible']/li[1]")),15000)
	await driver.findElement({xpath:"//ul[@class='location-list visible']/li[1]"}).click()
	await driver.findElement({id:'image0'}).sendKeys(`${__dirname}\\${allImages[0]}`)
	await imgLoad(0)
	await driver.findElement({id:'image1'}).sendKeys(`${__dirname}\\${allImages[1]}`)
	await imgLoad(1)
	await driver.findElement({id:'image2'}).sendKeys(`${__dirname}\\${allImages[2]}`)
	await imgLoad(2)
	await driver.findElement({id:'phone'}).clear()
	await driver.findElement({id:'phone'}).sendKeys(`0${data["Téléphone"]}`)
	await driver.findElement({id:'newadSubmit'}).submit()
	await domCheck()
	await driver.findElement({id:'accept_rule'}).click()
	await driver.findElement({id:'lbc_submit'}).click()
	await domCheck()
	
	for(var i=0;i<allImages.length;i++){
		if (fs.existsSync(allImages[i])) {
			fs.unlink(allImages[i])
		}
	}
	
	await driver.sleep(10000)
	logout().then(function(){},function(){
		clearInterval(hangCheck)
		driver.quit()
		callback()
	})
	
}

async function logout(){
	
	console.log(`Done with bot for ${data["Titre de l'annonce"]}, logging out`)
	
	await driver.get('https://compteperso.leboncoin.fr/account/index.html?ca=12_s')
	await domCheck()
	await driver.findElement({id:'account_logout'}).click()
	
	clearInterval(hangCheck)
	
	await driver.sleep(5000)
	await driver.quit()
	callback()
	
}
	
function domCheck(type){
	return new Promise(function(resolve,reject){
		var rscheck = setInterval(function(){
		driver.executeScript("return document.readyState").then(function(rs){
			//console.log(rs)
			if(type == undefined){
				if(rs == 'interactive' || rs == 'complete'){
					clearInterval(rscheck)
					resolve(rs)
				}
			} else {
				if(type == 'complete'){
					if(rs == 'complete'){
						clearInterval(rscheck)
						resolve(rs)
					}
				}
			}
		}).catch(function(){
			clearInterval(rscheck)
			reject()
		})
		},1000)
	})
}

function imgLoad(num){
	
	timeout = -60
	
	return new Promise(function(resolve,reject){
		var rscheck = setInterval(function(){
		
			driver.findElement({id:`uploadPhoto-${num}`}).then(function(el){
				el.getAttribute('data-state').then(function(res){
					if(res == 'uploaded'){
						clearInterval(rscheck)
						resolve()
					}
				})
			}).catch(function(){
				clearInterval(rscheck)
				reject()
			})
		
		},1000)
	})
	
}

function errorHandle(name,cb,arg){

errors++
console.log(`Error in function ${name}, errors = ${errors}`)

driver.takeScreenshot().then(function(image, err) {
	require('fs').writeFile(`error.png`, image, 'base64', function(err) {
	  // console.log(err);
	});
})

if(errors < 3){
	if(arg == undefined){
		driver.get('https://compteperso.leboncoin.fr/account/index.html?ca=12_s/').then(function(){
			cb().then(function(){},function(){errorHandle(name,cb)})
		})
	} else {
		driver.get('https://compteperso.leboncoin.fr/account/index.html?ca=12_s/').then(function(){
			cb(arg).then(function(){},function(){errorHandle(name,cb,arg)})
		})
	}
} else {
	console.log('Too many errors, repeating from start')
	clearInterval(hangCheck)
	for(var i=0;i<allImages.length;i++){
		if (fs.existsSync(allImages[i])) {
			fs.unlink(allImages[i])
		}
	}
	driver.quit()
	callback(true)
}

}

},bots_num)

bots.drain = function(){

	console.log('All Done')

}

bots.retry = function(){
    bots.pause();
	
	var str = this["Titre de l'annonce"];
	var test = getByValue(failedObj,str);
	
	if(test == null) {
		failedObj.push({name:str,attempts:1});
	} else {
		failedObj[failedObj.indexOf(test)].attempts = failedObj[failedObj.indexOf(test)].attempts + 1;
	}
	
    setTimeout(function(){
        bots.resume();
    }, 1000);
}

function start(data){
	bots.concurrency = bots_num;
	for(var i=0;i<data.length;i++){
		bots.push(data[i]);
	}
}

function getByValue(arr, value) {

  var result  = arr.filter(function(o){return o.name == value;} );

  return result? result[0] : null;

}