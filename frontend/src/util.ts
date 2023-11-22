import { useEffect, useState } from 'react';

export const EMPTY_IMG_SRC = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

export function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		let r = (Math.random() * 16) | 0,
			v = c == 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function f_time(_date_ = new Date()) {
	const d = _date_;
	const h = ('00' + d.getHours()).slice(-2);
	const m = ('00' + d.getMinutes()).slice(-2);
	const s = ('00' + d.getSeconds()).slice(-2);
	return h + ':' + m + ':' + s;
}

export function format_date(date = new Date()) {
	const year = date.toLocaleString('default', { year: 'numeric' });
	const month = date.toLocaleString('default', {
		month: '2-digit',
	});
	const day = date.toLocaleString('default', { day: '2-digit' });

	return [year, month, day].join('/') + " " + f_time(date);
}

export async function copyTextToClipboard(text: string) {
	if ('clipboard' in navigator) {
		return await navigator.clipboard.writeText(text);
	} else {
		return document.execCommand('copy', true, text);
	}
}


/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
export function human_file_size(bytes: number, si = true, dp = 1) {
	const thresh = si ? 1000 : 1024;

	if (Math.abs(bytes) < thresh) {
		return bytes + ' B';
	}

	const units = si
		? ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		: ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	let u = -1;
	const r = 10 ** dp;

	do {
		bytes /= thresh;
		++u;
	} while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


	return bytes.toFixed(dp) + ' ' + units[u];
}

/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
export function human_file_size_M(bytes: number, si = true, dp = 1) {
	bytes = bytes * 1024 * 1024;
	const thresh = si ? 1000 : 1024;

	if (Math.abs(bytes) < thresh) {
		return bytes + ' B';
	}

	const units = si
		? ['KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
		: ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
	let u = -1;
	const r = 10 ** dp;

	do {
		bytes /= thresh;
		++u;
	} while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


	return bytes.toFixed(dp) + ' ' + units[u];
}

export function check_email(s: string) {
	if (!s.match(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/)) return false;
	if (s.split('@')?.[1]?.indexOf('.') === -1) return false;
	return true;
}

export function check_password(s: string) {
	if (s.length < 8) return false;
	return true;
}

export function sleep(m: number) {
	return new Promise((resolve) => setTimeout(resolve, Math.floor(m)));
}

const POST_CACHE_TABLE = new Map();
export function clear_all_http_post_cache() {
	POST_CACHE_TABLE.clear();
}
interface post {
	(url: string, body: object): Promise<object>;
	(url: string, body: object, _params?: object): Promise<object>;
}
export async function http_post(url: string, body: object, _params?: object): Promise<object> {
	const params = { cache: false, cache_term: 5000 };
	if (_params) Object.assign(params, _params);
	if (params.cache) {
		const cache = POST_CACHE_TABLE.get(url + JSON.stringify(body));
		if (cache && cache.time > Date.now()) {
			return JSON.parse(JSON.stringify(cache.json));
		}
	}

	return await fetch(url, {
		body: JSON.stringify(body),
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		credentials: 'same-origin',
		mode: 'same-origin',
		redirect: 'follow',
	}).then(async (res) => {
		if (res.ok) {
			let json;
			try {
				json = await res.json()
			} catch (e) {
				console.error(url, e);
				return { error: 'Invalid response' };
			}
			if (params.cache) {
				POST_CACHE_TABLE.set(url + JSON.stringify(body), { json: JSON.parse(JSON.stringify(json)), time: Date.now() + params.cache_term });
			}
			return json;
		}
		return { error: 'Server Error: ' + res.status };
	});
}

const GET_CACHE_TABLE = new Map();
export function clear_all_http_get_cache() {
	POST_CACHE_TABLE.clear();
}
interface get {
	(url: string, query?: object): Promise<object>;
	(url: string, query?: object, _params?: object): Promise<object>;
}
export async function http_get(url: string, query?: object, _params?: object): Promise<object> {
	const params = { cache: false, cache_term: 5000 };
	if (_params) Object.assign(params, _params);
	if (params.cache) {
		const cache = GET_CACHE_TABLE.get(url + JSON.stringify(query));
		if (cache && cache.time > Date.now()) {
			return JSON.parse(JSON.stringify(cache.json));
		}
	}

	return await fetch(url, {
		method: 'GET',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		credentials: 'same-origin',
		mode: 'same-origin',
		redirect: 'follow',
	}).then(async (res) => {
		if (res.ok) {
			let json;
			try {
				json = await res.json();
			} catch (e) {
				console.error(url, e);
				return { error: 'Invalid response' };
			}
			if (params.cache) {
				GET_CACHE_TABLE.set(url + JSON.stringify(query), { json: JSON.parse(JSON.stringify(json)), time: Date.now() + params.cache_term });
			}
			return json;
		}
		return { error: 'Server Error: ' + res.status };
	});
}

function load_script(s: string) {
	const script = document.createElement('script');
	script.src = s;
	script.async = true;
	document.body.appendChild(script);
}

function useFetchPost(url: string, params: object = {}) {
	const [response, setResponse] = useState(null);
	const [flag, setFlag] = useState(true);
	useEffect(() => {
		if (flag) {
			setFlag(false);
			console.log("POST:", url);
			http_post(url, params).then((data: any) => {
				if (data == null) console.error("Data is null");
				setResponse(data);
			});
		}
	}, [flag]);
	return [response, () => { setFlag(true); }];
}
function useFetchGet(url: string, params: object = {}): Array<any> {
	const [response, setResponse] = useState(null);
	const [flag, setFlag] = useState(true);
	useEffect(() => {
		if (flag) {
			setFlag(false);
			console.log("GET:", url);
			http_get(url, params).then((data: any) => {
				if (data == null) console.error("Data is null");
				setResponse(data);
			});
		}
	}, [flag]);
	return [response, () => { setFlag(true); }];
}

const SystemStates = new Map();
function SystemStateObserver(key: string, value: any, callback: (v: any) => void) {
	if (SystemStates.get(key) != value) {
		SystemStates.set(key, value);
		callback({ key, value });
	}
}
setInterval(() => {
	clear_all_http_get_cache();
	clear_all_http_post_cache();
}, 60 * 1000);
export default {
	check_email,
	check_password,
	sleep,
	load_script,
	post: http_post as post,
	get: http_get as get,
	useFetchPost,
	useFetchGet,
	human_file_size,
	human_file_size_M,
	SystemStateObserver,
	copyTextToClipboard,
	f_time,
	format_date,
	clear_http_cache: () => {
		clear_all_http_get_cache();
		clear_all_http_post_cache();
	},
	uuidv4,
	EMPTY_IMG_SRC,
};
