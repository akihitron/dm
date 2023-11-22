import React from 'react';
import { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import { ThemeOptions, useMediaQuery } from '@mui/material';
import { createTheme } from '@mui/material/styles';

import ct from 'countries-and-timezones';

import { useTranslation, initReactI18next } from 'react-i18next';
import i18n from 'i18next';
import enJson from './i18n/en.json';
import jaJson from './i18n/ja.json';

import { useIdle, useNetworkState } from 'react-use';
import U from './util';


const default_color_mode = ['dark', 'light'].includes(localStorage.color_mode) ? localStorage.color_mode : 'system';
localStorage.color_mode = undefined;

const FONTS = ['Roboto', "'Helvetica Neue'", 'Arial', "'Hiragino Kaku Gothic ProN'", "'Hiragino Sans'", "'Noto Sans JP'", 'Meiryo', 'sans-serif'].join(',');
const LIGHT_THEME = {
	typography: {
		fontFamily: FONTS,
		button: {
			textTransform: 'none',
		},
	},
	props: {
		MuiTextField: {
			variant: 'outlined',
		},
	},

	palette: {
		mode: 'light',
		background: {
			default: '#F5F5F5',
		},
		primary: {
			main: '#37F',
		},
		secondary: {
			main: '#555',
		},
		warning: {
			main: '#B50',
		},
		info: {
			main: '#57A',
		},
		success: {
			main: '#2A2',
		},
	},
	components: {
		MuiAppBar: {
			styleOverrides: {
				colorPrimary: {
					// backgroundColor: "#DDDDFF",
					backgroundColor: '#37F',
				},
			},
		},
	},
};

function merge(s: any, n: any) {
	for (const k in n) {
		const st = typeof s[k];
		const nt = typeof n[k];
		if (s[k] == null && nt == 'object') {
			s[k] = {};
			merge(s[k], n[k]);
		} else if (nt == 'object' && st == 'object') {
			merge(s[k], n[k]);
		} else if (nt == st) {
			s[k] = n[k];
		} else if (st == null) {
			s[k] = n[k];
		} else {
			debugger;
		}
	}
	return s;
}

const DARK_THEME = merge(JSON.parse(JSON.stringify(LIGHT_THEME)), {
	palette: {
		mode: 'dark',
		background: {
			default: '#222222',
		},
		primary: {
			main: '#37F',
		},
		secondary: {
			main: '#555',
		},
		warning: {
			main: '#B50',
		},
		info: {
			main: '#57A',
		},
		success: {
			main: '#2A2',
		},
	},
	components: {
		MuiAppBar: {
			styleOverrides: {
				colorPrimary: {
					backgroundColor: '#222222',
				},
			},
		},
	},
});

const DarkTheme = createTheme(DARK_THEME as ThemeOptions);
const LightTheme = createTheme(LIGHT_THEME as ThemeOptions);

function useAppTheme() {
	const [color_mode, setColorMode] = useState(default_color_mode);
	let is_dark_theme = false;
	if (color_mode == 'system') {
		const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
		is_dark_theme = prefersDarkMode;
	} else {
		is_dark_theme = color_mode == 'dark';
	}
	return { theme: is_dark_theme ? DarkTheme : LightTheme, is_dark_theme: is_dark_theme, color_mode, setColorMode };
}



const DEBUG = true;

// system, dark, light
const AVAILABLE_LANGS: any = { 'en': true, 'ja': true };
const available_langs = Object.keys(AVAILABLE_LANGS).filter(lang => AVAILABLE_LANGS[lang]);
const SYSTEM_LANG = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0];
const default_lang = localStorage.lang ?? (AVAILABLE_LANGS[SYSTEM_LANG] ? SYSTEM_LANG : 'en');
i18n.use(initReactI18next).init({
	debug: true,
	resources: {
		en: { translation: enJson },
		ja: { translation: jaJson },
	},
	lng: default_lang,
	fallbackLng: 'en',
	returnEmptyString: false,
});
const g_use_debug_components = localStorage.use_debug_components == 'true' ? true : false;
const store: any = {
	theme: null,
	country: ct.getTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)?.countries?.[0] ?? 'US',
	lang: default_lang,
	user: {},
	is_debug_mode: DEBUG,
	is_logged_in: null,
	is_dark_theme: false,
	is_administrator: false,
	use_debug_components: g_use_debug_components,
	available_langs: available_langs,
	setColorMode: (s: string) => { },
	setLogin: (b: boolean) => { },
	setLang: (s: string) => { },
	setAdministratorFlag: (b: boolean) => { },
	toggleDebugComponents: () => { },
};
export const AppContext = createContext(store);

export function StoreContextProvider(props: { children: ReactNode | JSX.Element }) {
	const { i18n } = useTranslation();
	const [s_lang, setLang] = useState(default_lang);
	const [is_administrator, setAdministratorFlag] = useState(false);
	const T = i18n.t;
	useEffect(() => {
		i18n.changeLanguage(s_lang);
		document.title = T('app_name');
	}, [s_lang]);

	const { theme, is_dark_theme, setColorMode } = useAppTheme();
	const [is_logged_in, setLogin] = useState<Boolean|null>(null);
	const [user, setUser] = useState({});
	const [debug_components, setDebugComponents] = useState(g_use_debug_components);

	// console.log("Login", is_logged_in);
	if (false) {
		// React-use
		const network_state = useNetworkState();
		U.SystemStateObserver('network:online', network_state.online, (o) => {
			console.log(o.key, o.value);
		});
		const idle_state = useIdle();
		U.SystemStateObserver('idle', idle_state, (o) => {
			console.log(o.key, o.value);
		});
	}
	function toggleDebugComponents() {
		const enable_debugger = !debug_components;
		setDebugComponents(enable_debugger);
		localStorage.use_debug_components = enable_debugger ? 'true' : 'false';
	}

	return (
		<AppContext.Provider
			value={{
				theme,
				is_logged_in,
				lang: s_lang,
				country: ct.getTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)?.countries?.[0] ?? 'US',
				is_debug_mode: DEBUG,
				is_dark_theme: is_dark_theme,
				is_administrator: is_administrator,
				use_debug_components: debug_components,
				user: user,
				available_langs: available_langs,
				
				toggleDebugComponents: () => {
					toggleDebugComponents();
				},
				setLogin: (b: boolean) => {
					setLogin(b);
				},
				setUser: (user: any) => {
					if (user) {
						setAdministratorFlag(user.is_administrator);
					}
					setUser(user);
				},
				setAdministratorFlag: (b: boolean) => {
					setAdministratorFlag(b);
				},
				setLang: (s: string) => {
					setLang(s);
					localStorage.lang = s;
				},
				setColorMode: (s: string) => {
					setColorMode(s);
					localStorage.color_mode = s;
				},
			}}
		>
			{props.children}
		</AppContext.Provider>
	);
}

export const useStore = () => {
	return useContext(AppContext);
};


const getLocalStorageValue = (key: string, initValue: string) => {
	const item = localStorage.getItem(key);
	return item ? item : initValue;
}

export const useLocalStorage = (key: string, initValue: string) => {
	const [value, setValue] = useState(() =>
		getLocalStorageValue(key, initValue)
	);
	return [value, setValue] as const;
};
