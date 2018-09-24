'use strict';

const express = require('express');
const path = require('path');
const request = require('request');
const hbs = require('hbs');

const port = process.env.PORT || 3010;


let app = express();
let results;

app.set('view engine', 'hbs');


app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/public/home.html'));
});

app.get('/weather', (req, res) => {
    
    let location = req.query.address;
    location = encodeURIComponent(location);
    // console.log(location);
    
    request({
        url: `https://us1.locationiq.com/v1/search.php?key=0c49d4b22f610c&q=${location}&format=json`,
		json: true,
    },(error, response, body) => {
        results = {
            lat: body[0].lat,
            lon: body[0].lon,
            loc: body[0].display_name,
        }
        // console.log(results.lat, results.lon);

        request({
        url: `https://api.darksky.net/forecast/a4a1eece83cc4d9087a11e07c1ff144d/${results.lat},${results.lon}`,
        json: true,
        }, (error, response, body) => {
            res.render('weather.hbs', {
                areaCaptured: results.loc,
                temperature: Math.round((body.currently.temperature - 32) * (5/9)) + ' °C',
                apparentTemperature: Math.round((body.currently.apparentTemperature - 32) * (5/9)) + ' °C',
                summary: body.currently.summary,
                humidity: ((body.currently.humidity*100) + '%'),
                forecast: body.hourly.summary,
                windSpeed: (Math.round((body.currently.windSpeed * 1.7)) + ' KPh'),
            });
        });

        
    });
    
});

app.listen(port, () => {
	console.log(`Server running in port ${port}`);
});
