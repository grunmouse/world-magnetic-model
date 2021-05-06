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

function sphericalCoord(ellipsoid, rlon, rlat, alt){
	let a = ellipsoid.a, b = ellipsoid.b;
	
	let srlat = Math.sin(rlat);
	let crlat = Math.cos(rlat);
	let srlon = Math.sin(rlon);
	let crlon = Math.cos(rlon);
	
	let srlat2 = srlat **2;
	let crlat2 = crlat **2;

	let a2 = a ** 2;
	let b2 = b ** 2;
	let c2 = a2 - b2; /* квадрат полуфокусного */
	//let e2 = c2/a2; /* квадрат эксцентриситета */
	//let a4 = a2 ** 2;
	//let b4 = b2 ** 2;
	//let c4 = a4 - b4;		
	let d = Math.sqrt(a2 * crlat2 + b2 * srlat2);
	
	let N = a2/d;
	let X = (N + alt)*crlat*crlon;
	let Y = (N + alt)*crlat*srlon;
	let Z = (b2/a2*N + alt)*srlat;
	
	let teta = Math.atan2(Math.hypot(X,Y), Z);
	let phi = Math.atan2(X, Y);
	let r = Math.hypot(X, Y, Z);
	return {
		teta,
		phi,
		r
	};
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
				alt = h || 0,
				dt = date - epoch, /* Время от начала эпохи в годах*/
				
				rlat = deg2rad(glat),
				rlon = deg2rad(glon),
				srlon = Math.sin(rlon),
				srlat = Math.sin(rlat),
				crlon = Math.cos(rlon),
				crlat = Math.cos(rlat),
				
				//srlat2 = srlat **2,
				//crlat2 = crlat **2,
				ct,
				st,
				r,
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
			
			/* CONVERT FROM GEODETIC COORDS. TO SPHERICAL COORDS. */
			{
				let speric = sphericalCoord(ellipsoid, rlon, rlat, alt);

				/**
				 * @var ct, st - косинус и синус тета
				 */
	
				ct = Math.cos(speric.teta);
				st = Math.sin(speric.teta);
				r = speric.r;
				
				let al = rlat - (Math.PI/2-speric.teta); // Угол между системами координат (с учётом различия направления отсчёта)
				/**
				 * @var ca, sa - косинус и синус ЧЕГО???
				 */
				//ca = (alt + d) / r;
				//sa = c2 * crlat * srlat / (r * d);
				
				ca = Math.cos(al);
				sa = Math.sin(al);
				
				//console.log(Math.atan(sa, ca) - ((Math.PI/2-teta) - rlat));
			}
			
			
			
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