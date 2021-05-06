const WMM = require('./model.js');
const WMM2020data = require('./wmm2020/wmm.js');

const WMM2020 = new WMM(WMM2020data);

const calculate = WMM2020.calculate;

module.exports = {
	WMM,
	WMM2020
}