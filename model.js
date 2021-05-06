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
				throw new Error("Модель не сконфигурирована.");
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
				/*
					@var br, bp, bt - компоненты вектора магнитного поля относительно полярной системы координат
				*/
				br = 0,
				bt = 0,
				bp = 0,
				
				bpp = 0, //Отдельный расчёт bpp для st===0
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


			let {r, teta} = sphericalCoord(ellipsoid, rlon, rlat, alt);
			let ct = Math.cos(teta);
			let st = Math.sin(teta);
			
			let al = rlat - (Math.PI/2-teta); // Угол между системами координат (с учётом различия направления отсчёта)
			
			let ca = Math.cos(al);
			let sa = Math.sin(al);
			
			var sp = [], cp = [];
			sp[0] = 0;
			cp[0] = 1;
			sp[1] = srlon;
			cp[1] = crlon;
			for (let m = 2; m <= maxord; m++) {
				sp[m] = srlon * cp[m - 1] + crlon * sp[m - 1];
				cp[m] = crlon * cp[m - 1] - srlon * sp[m - 1];
			}
			
			var pp = [];
			pp[0] = 1;
			pp[1] = 1;
			for(let n=2; n<=maxord; ++n){
				pp[n] = ct * pp[n - 1] - k[1][n] * pp[n - 2];
			}
			
			let p = Array.from({length:maxord+1}, ()=>([]));
			let dp = Array.from({length:maxord+1}, ()=>([]));
			p[0][0] = 1;
			dp[0][0] = 0;
			for (let n = 1; n <= maxord; ++n) {
				for (let m = 0; m <=n; ++m) {
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
				}
			}
			

			const ftc = (m, n, dt)=>(c[m][n] + dt * cd[m][n]);
			
			let aor = re / r;
			let ar = aor * aor;
			for (let n = 1; n <= maxord; ++n) {
				ar = ar * aor;
				//ar = aor ** (n+2); //Совпадает почти точно
				for (let m = 0; m <=n; ++m) {
					let par = ar * p[m][n];
					let tcmn = ftc(m, n, dt);
					let temp1, temp2;
					if (m === 0) {
						temp1 = tcmn * cp[m];
						temp2 = tcmn * sp[m];
					} 
					else {
						let tcnm1 = ftc(n, m-1, dt);
						temp1 = tcmn * cp[m] + tcnm1 * sp[m];
						temp2 = tcmn * sp[m] - tcnm1 * cp[m];
					}
					bt = bt - ar * temp1 * dp[m][n];
					bp += (m * temp2 * par);
					br += ((n+1) * temp1 * par);

					if (st === 0 && m === 1) {
						let parp = ar * pp[n];
						bpp += (m * temp2 * parp);
					}
				}
			}

			bp = (st === 0 ? bpp : bp / st);
			
			bx = -bt * ca - br * sa;
			by = bp;
			bz = bt * sa - br * ca;

			bh = Math.hypot(bx, by); /* горизонтальная интенсивность */
			ti = Math.hypot(bh, bz); /* полная интенсивность */
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
				"F": ti	,
				rDec,
				rInc
			};
		};
	}
					
module.exports = WMM;