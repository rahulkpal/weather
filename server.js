const express = require('express');
const path = require('path');
const request = require('request');
const hbs = require('hbs');
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config();

const port = process.env.PORT || 3010;

function dbConnection() {
    let client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: true,
    });
    return client;
}

let app = express();
let results;

app.set('view engine', 'hbs');


app.use(express.static(__dirname + '/public'));

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({extended: true}));

// Parse JSON bodies (as sent by API clients)
// app.use(express.json());

app.get('/', (req, res) => {
    let d = new Date;
    let logObj = {
        userAgent: req.headers['user-agent'],
        userIp: req.ip,
        hostName: req.hostname,
        protocol: req.protocol,
        path: req.path,
        dateTimeUTC: d.toUTCString(),
        dateTimeLocal: d.toString()
    }
    let query = {
      text: 'INSERT INTO userlogs(logs) VALUES($1)',
      values: [JSON.stringify(logObj)]
    }
    let conn = dbConnection();
    conn.connect();
    conn.query(query, (err, res) => {
      if (err) throw err;
      conn.end();
    });
    
    res.sendFile(path.join(__dirname + '/public/home.html'));
});

app.post('/weather', (req, res) => {
    let d = new Date;
    let location = req.body.address;
    let lat = req.body.lat;
    let lon = req.body.lon;

    let logObj = {
        userAgent: req.headers['user-agent'],
        userIp: req.ip,
        hostName: req.hostname,
        protocol: req.protocol,
        path: req.path,
        dateTimeUTC: d.toUTCString(),
        dateTimeLocal: d.toString()
    };
    
    if (location === '') {
        request({
            url: `https://us1.locationiq.com/v1/reverse.php?key=${process.env.LOCATIONIQ}&lat=${lat}&lon=${lon}&format=json`,
            json: true,
        },(error, response, body) => {
            if (error) {
                res.render('ehandler.hbs', {
                    pageTitle: 'Location API Error!',
                    message: 'Unable to connect to Location API, please go back and try again!'
                });
            } else if (body.error === 'Unable to geocode') {
                res.render('ehandler.hbs', {
                    pageTitle: 'Unable to get Geocode!',
                    message: 'Please check the address that you have entered and try again!'
                });
            } else if (response.statusCode === 200) {
                locationDetected = body.display_name;
                request({
                url: `https://api.darksky.net/forecast/${process.env.DARKSKY}/${lat},${lon}`,
                json: true,
                }, (error, response, body) => {
                    res.render('weather.hbs', {
                        areaCaptured: locationDetected,
                        temperature: Math.round((body.currently.temperature - 32) * (5/9)) + ' °C',
                        apparentTemperature: Math.round((body.currently.apparentTemperature - 32) * (5/9)) + ' °C',
                        summary: body.currently.summary,
                        humidity: (Math.round(body.currently.humidity*100) + '%'),
                        forecast: body.hourly.summary,
                        windSpeed: (Math.round((body.currently.windSpeed * 1.7)) + ' KPh'),
                    });
                });  
            }
        });

        logObj.lat = lat;
        logObj.lon = lon;
    } else if (lat === '' && lon === '') {
        logObj.location = location;
        location = encodeURIComponent(location);
        request({
            url: `https://us1.locationiq.com/v1/search.php?key=${process.env.LOCATIONIQ}&q=${location}&format=json`,
            json: true,
        },(error, response, body) => {
            if (error) {
                res.render('ehandler.hbs', {
                    pageTitle: 'Location API Error!',
                    message: 'Unable to connect to Location API, please go back and try again!'
                });
            } else if (body.error === 'Unable to geocode') {
                res.render('ehandler.hbs', {
                    pageTitle: 'Unable to get Geocode!',
                    message: 'Please check the address that you have entered and try again!'
                });
            } else if (response.statusCode === 200) {
                results = {
                    lat: body[0].lat,
                    lon: body[0].lon,
                    loc: body[0].display_name,
                }
                request({
                url: `https://api.darksky.net/forecast/${process.env.DARKSKY}/${results.lat},${results.lon}`,
                json: true,
                }, (error, response, body) => {
                    res.render('weather.hbs', {
                        areaCaptured: results.loc,
                        temperature: Math.round((body.currently.temperature - 32) * (5/9)) + ' °C',
                        apparentTemperature: Math.round((body.currently.apparentTemperature - 32) * (5/9)) + ' °C',
                        summary: body.currently.summary,
                        humidity: (Math.round(body.currently.humidity*100) + '%'),
                        forecast: body.hourly.summary,
                        windSpeed: (Math.round((body.currently.windSpeed * 1.7)) + ' KPh'),
                    });
                });  
            }
        });
    }

    let query = {
      text: 'INSERT INTO userlogs(logs) VALUES($1)',
      values: [JSON.stringify(logObj)]
    }

    let conn = dbConnection();
    conn.connect();
    conn.query(query, (err, res) => {
      if (err) throw err;
      conn.end();
    });
});

app.listen(port, () => {
	console.log(`Server running in port ${port}`);
});