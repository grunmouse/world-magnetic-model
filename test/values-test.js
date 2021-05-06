const assert = require('assert');

const toCompare = [
	"date",
	"height",
	"latitude",
	"longitude",
	"declination",
	"inclination",
	"H",
	"X",
	"Y",
	"Z",
	"F"
];

function valuesTest(calculate, test_values){
	describe('test-values', ()=>{
		for(let val of test_values){
			let date = val.date.val, h = val.height.val, lat = val.latitude.val, lon = val.longitude.val;
			let result = calculate(lat, lon, h, date);
			it(`${date} ${h} ${lat} ${lon}`, ()=>{
				for(let key of toCompare){
					let control = val[key];
					assert.equal(result[key].toPrecision(control.precision), control.str, key);
				}
			});
		}
	});
}

module.exports = valuesTest;