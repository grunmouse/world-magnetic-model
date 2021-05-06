const {
	parseCof,
	unnormalize
} = require('./parse-cof.js');


function rad2deg(rad) {
	return rad * (180 / Math.PI);
}
function deg2rad(deg) {
	return deg * (Math.PI / 180);
}

/**
 * возвращает дату в годах и долях года
 * Странное решение, надо переделать
 */
function decimalDate(date) {
	var year = date.getFullYear(),
		daysInYear = 365 + (((year % 400 === 0) || (year % 4 === 0 && (year % 100 > 0))) ? 1 : 0),
		msInYear = daysInYear * 24 * 60 * 60 * 1000;

	return date.getFullYear() + (date.valueOf() - (new Date(year, 0)).valueOf()) / msInYear;
}
						
	/**
	 * @param model - текст файла коэффициентов или готовые данные
	 */
	function WMM(model) {
		'use strict';
		var ellipsoid = {a:6378.137, b:6356.7523142, re:6371.2},
			unnormalizedWMM;
		
		

		if (model !== undefined) {
			if (typeof model === 'string') { 
				unnormalizedWMM = unnormalize(parseCof(model));
			} else if (typeof model === 'object') { 
				unnormalizedWMM = model;
			} else {
				throw new Error("Invalid argument type");
			}
		}

		//console.log(unnormalizedWMM);
		
		this.getWmm = function () {
			return wmm;
		};
		this.setUnnorm = function (val) {
			unnormalizedWMM = val;
		};
		this.getUnnorm = function () {
			return unnormalizedWMM;
		};
		this.getEpoch = function () {
			return unnormalizedWMM.epoch;
		};
		this.setEllipsoid = function (e) {
			ellipsoid = e;
		};
		this.getEllipsoid = function () {
			return ellipsoid;
		};
		/**
		 * @param glat : Number - широта в градусах
		 * @param glon : Number - долгота в градусах
		 * @param h : Number - высота в километрах
		 * @param date : (Date|Number) - дата или десятичная дата в годах
		 */
		this.calculate = function (glat, glon, h, date) {
			if (unnormalizedWMM === undefined) {
				throw new Error("Модель не сконфигурирована.")
			}
			if (glat === undefined || glon === undefined) {
				throw new Error("Не переданы координаты.");
			}
			
			if(date instanceof Date){
				date = decimalDate(date);
			}


			var epoch = unnormalizedWMM.epoch,
				k = unnormalizedWMM.k,
				c = unnormalizedWMM.c,
				cd = unnormalizedWMM.cd,
				maxord = unnormalizedWMM.maxord,
				a = ellipsoid.a,
				b = ellipsoid.b,   
				re = ellipsoid.re,
				a2 = a ** 2,
				b2 = b ** 2,
				c2 = a2 - b2, /* квадрат полуфокусного */
				a4 = a2 ** 2,
				b4 = b2 ** 2,
				c4 = a4 - b4,								
				alt = h || 0,
				dt = date - epoch,
				
				rlat = deg2rad(glat),
				rlon = deg2rad(glon),
				srlon = Math.sin(rlon),
				srlat = Math.sin(rlat),
				crlon = Math.cos(rlon),
				crlat = Math.cos(rlat),
				
				srlat2 = srlat **2,
				crlat2 = crlat **2,
				q,
				q1,
				q2,
				ct,
				st,
				r2,
				r,
				d,
				ca,
				sa,
				aor,
				ar,
				br = 0,
				bt = 0,
				bp = 0,
				bpp = 0,
				par,
				parp,
				D4,
				m,
				n,
				fn = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
				fm = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
				z = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				pp = z.slice(),
				p = Array.from({length:13}, ()=>(z.slice())),
				dp = Array.from({length:13}, ()=>(z.slice())),
				/*
					@var bx, by, bz - компоненты вектора магнитного поля
				*/
				bx,
				by,
				bz,
				bh,
				ti,
				dec,
				dip,
				gv;

			pp[0] = 1;
			p[0][0] = 1;
			
			q = Math.sqrt(a2 - c2 * srlat2);
			q1 = alt * q;
			q2 = ((q1 + a2) / (q1 + b2)) ** 2;
			
			ct = srlat / Math.sqrt(q2 * crlat2 + srlat2);
			st = Math.sqrt(1 - ct ** 2);
			
			r2 = alt**2 + 2 * q1 + (a4 - c4 * srlat2) / (q **2);
			r = Math.sqrt(r2);
			d = Math.sqrt(a2 * crlat2 + b2 * srlat2);
			/**
			 * @var ca, sa - косинус и синус ЧЕГО???
			 */
			ca = (alt + d) / r;
			sa = c2 * crlat * srlat / (r * d);
			
			var sp = new Array(13), cp = new Array(13);
			sp[0] = 0;
			cp[0] = 1;
			sp[1] = srlon;
			cp[1] = crlon;
			for (m = 2; m <= maxord; m++) {
				sp[m] = srlon * cp[m - 1] + crlon * sp[m - 1];
				cp[m] = crlon * cp[m - 1] - srlon * sp[m - 1];
			}

			aor = re / r;
			ar = aor * aor;

			const ftc = (m, n)=>(c[m][n] + dt * cd[m][n]);

			for (n = 1; n <= maxord; n++) {
				ar = ar * aor;
				//ar = aor ** (n+2); //Совпадает почти точно
				for (m = 0, D4 = (n + m + 1); D4 > 0; D4--, m++) {

					if (n === m) {
						p[m][n] = st * p[m - 1][n - 1];
						dp[m][n] = st * dp[m - 1][n - 1] + ct *	p[m - 1][n - 1];
					} 
					else if (n === 1 && m === 0) {
						p[m][n] = ct * p[m][n - 1];
						dp[m][n] = ct * dp[m][n - 1] - st * p[m][n - 1];
					} 
					else if (n > 1 && n !== m) {
						let tail = p[m][n - 2];
						let dtail = dp[m][n - 2];
						if (m > n - 2) { 
							//p[m][n - 2] = 0; 
							//dp[m][n - 2] = 0; 
							tail = 0;
							dtail = 0;
						}
						p[m][n] = ct * p[m][n - 1] - k[m][n] * tail;
						dp[m][n] = ct * dp[m][n - 1] - st * p[m][n - 1] - k[m][n] * dtail;
					}

					par = ar * p[m][n];
					let tcmn = ftc(m, n);
					let temp1, temp2;
					if (m === 0) {
						temp1 = tcmn * cp[m];
						temp2 = tcmn * sp[m];
					} 
					else {
						let tcnm1 = ftc(n, m-1);
						temp1 = tcmn * cp[m] + tcnm1 * sp[m];
						temp2 = tcmn * sp[m] - tcnm1 * cp[m];
					}
					bt = bt - ar * temp1 * dp[m][n];
					bp += (fm[m] * temp2 * par);
					br += (fn[n] * temp1 * par);

					if (st === 0 && m === 1) {
						if (n === 1) {
							pp[n] = pp[n - 1];
						} 
						else {
							pp[n] = ct * pp[n - 1] - k[m][n] * pp[n - 2];
						}
						parp = ar * pp[n];
						bpp += (fm[m] * temp2 * parp);
					}
				}
			}

			bp = (st === 0 ? bpp : bp / st);
			
			bx = -bt * ca - br * sa;
			by = bp;
			bz = bt * sa - br * ca;

			bh = Math.sqrt(bx**2 + by**2); /* горизонтальная интенсивность */
			ti = Math.sqrt(bh**2 + bz**2); /* полная интенсивность */
			var rDec = Math.atan2(by, bx); /* склонение (деклинация) */
			var rInc = Math.atan2(bz, bh); /* наклонение (инклинация) */
			dec = rad2deg(rDec);
			dip = rad2deg(rInc);

			if (Math.abs(glat) >= 55) {
				if (glat > 0){
					gv = dec - glon;
				}
				else if(glat < 0){
					gv = dec + glon;
				}
				while (gv > 180) {
					gv -= 360;
				} 
				while (gv < -180) { 
					gv += 360; 
				}
			}

			return {
				dec: dec, 
				dip: dip, 
				ti: ti, 
				bh: bh, 
				bx: bx, 
				by: by, 
				bz: bz, 
				lat: glat, 
				lon: glon, 
				gv: gv,
				"date" : date,
				"height": h,
				"latitude": glat,
				"longitude": glon,
				"declination": dec,
				"inclination": dip,
				"H": bh,
				"X": bx,
				"Y": by,
				"Z": bz,
				"F": ti				
			};
		};
	}
					
module.exports = WMM;