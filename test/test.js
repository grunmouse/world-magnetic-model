const assert = require('assert');
const fs = require('fs');
const Path = require('path');
const Model = require('../model.js')
const valuesTest = require('./values-test.js');
const parseTestValues = require('./parse-test-values.js');

const wmm2020data = require('../wmm2020/wmm.js');

const cof = fs.readFileSync(Path.join(module.path, '../wmm2020/WMM.COF'), {encoding:'utf8'});
const txt = fs.readFileSync(Path.join(module.path, '../wmm2020/WMM2020_TEST_VALUES.txt'),{encoding:'utf8'});

const test_values = parseTestValues(txt);

describe('WMM2020 by source', ()=>{
	const model = new Model(cof);
	valuesTest(model.calculate, test_values);
});
describe('builded WMM2020', ()=>{
	const model = new Model(wmm2020data);
	valuesTest(model.calculate, test_values);
});