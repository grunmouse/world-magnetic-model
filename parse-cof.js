function parseCof(cof) {
	var modelLines = cof.split('\n'), wmm = [], i, vals, epoch, model, modelDate;
	for (i=0; i<modelLines.length; ++i) {
		vals = modelLines[i].replace(/^\s+|\s+$/g, "").split(/\s+/);
		if (vals.length === 3) {
			epoch = parseFloat(vals[0]);
			model = vals[1];
			modelDate = vals[2];
		} else if (vals.length === 6) {
			wmm.push({
				n: parseInt(vals[0], 10),
				m: parseInt(vals[1], 10),
				gnm: parseFloat(vals[2]),
				hnm: parseFloat(vals[3]),
				dgnm: parseFloat(vals[4]),
				dhnm: parseFloat(vals[5])
			});
		}
	}

	return {
		epoch: epoch, 
		model: model, 
		modelDate: modelDate, 
		wmm: wmm
	};
}					
	
function unnormalize(wmm) {
	var i, j, m, n, D2, flnmj,
		z = new Array(13).flat(0),
		c = Array.from({length:13}, ()=>(z.slice())),
		cd = Array.from({length:13}, ()=>(z.slice())),
		k = Array.from({length:13}, ()=>(z.slice())),
		snorm = Array.from({length:13}, ()=>(z.slice())),
		model = wmm.wmm;
	var maxord = 0;
	for (let i = 0; i<model.length; ++i) {
		if(model[i].n > maxord){
			maxord = model[i].n;
		}
		if (model[i].m <= model[i].n) {
			c[model[i].m][model[i].n] = model[i].gnm;
			cd[model[i].m][model[i].n] = model[i].dgnm;
			if (model[i].m !== 0) {
				c[model[i].n][model[i].m - 1] = model[i].hnm;
				cd[model[i].n][model[i].m - 1] = model[i].dhnm;
			}
		}
	}
	snorm[0][0] = 1;

	for (n = 1; n <= maxord; n++) {
		snorm[0][n] = snorm[0][n - 1] * (2 * n - 1) / n;
		j = 2;

		for (m = 0, D2 = (n - m + 1); D2 > 0; D2--, m++) {
			k[m][n] = (((n - 1) * (n - 1)) - (m * m)) /	((2 * n - 1) * (2 * n - 3));
			if (m > 0) {
				flnmj = ((n - m + 1) * j) / (n + m);
				snorm[m][n] = snorm[m - 1][n] * Math.sqrt(flnmj);
				j = 1;
				c[n][m - 1] = snorm[m][n] * c[n][m - 1];
				cd[n][m - 1] = snorm[m][n] * cd[n][m - 1];
			}
			c[m][n] = snorm[m][n] * c[m][n];
			cd[m][n] = snorm[m][n] * cd[m][n];
		}
	}
	k[1][1] = 0;

	return {
		epoch: wmm.epoch, 
		k: k, 
		c: c, 
		cd: cd,
		maxord: maxord
	};
	
}	

module.exports = {
	parseCof,
	unnormalize
}