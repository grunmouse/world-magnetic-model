const fs = require('fs');
const Path = require('path');

const {
	parseCof,
	unnormalize
} = require('./parse-cof.js');

const cof = fs.readFileSync(Path.join(module.path, './wmm2020/WMM.COF'), {encoding:'utf8'});

const wmm = unnormalize(parseCof(cof));

const code = 'module.exports = ' + JSON.stringify(wmm);

fs.writeFileSync(Path.join(module.path, './wmm2020/wmm.js'), code);