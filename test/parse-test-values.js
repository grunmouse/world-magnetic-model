
const fieldNames = [
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
	"F",
	"dD",
	"dI",
	"dH",
	"dX",
	"dY",
	"dZ",
	"dF"
];

function makeObj(arr){
	let result = {};
	for(let i=0; i<fieldNames.length; ++i){
		let key = fieldNames[i];
		let str = arr[i];
		let val = +str;
		let digits = str.replace(/\D/g,'').replace(/^0/,'');
		let precision = digits.length;
		if(str === '0'){
			precision = 1;
		}
		if(precision<1 || precision>100){
			console.log(str);
		}
		result[key] = {
			str,
			val,
			precision
		};
	}
	return result;
}

function parseTestValues(code){
	let rows = code.trim().split(/[\r\n]+/g);
	let data = rows
		.filter((row)=>(!/^\s*#/.test(row)))
		.map((row)=>(makeObj(row.trim().split(/\s+/g))));
	return data;
}

module.exports = parseTestValues;