const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const querystring = require('querystring');
const totp = require('totp-generator');

class FacebookAuth {
    constructor(config = {}) {
        this.config = config;
        this.userAgent = 'Mozilla/5.0 (Linux; Android 12; TECNO CH9 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/109.0.5414.118 Mobile Safari/537.36[FBAN/EMA;FBLC/pt_BR;FBAV/339.0.0.10.100;]';
        this.apiUrl = 'https://b-graph.facebook.com/auth/login';
    }

    generateDeviceId() {
        return uuidv4();
    }

    generateMachineId(length = 24) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    sortObject(obj) {
        return Object.keys(obj)
            .sort()
            .reduce((result, key) => {
                result[key] = obj[key];
                return result;
            }, {});
    }

    generateSignature(data) {
        // Implementation of encodesig function goes here
        // You'll need to implement the actual signature generation logic
        return 'generated_signature';
    }

    buildLoginForm(credentials) {
        const form = {
            adid: this.generateDeviceId(),
            email: credentials.email,
            password: credentials.password,
            format: 'json',
            device_id: this.generateDeviceId(),
            cpl: 'true',
            family_device_id: this.generateDeviceId(),
            locale: 'vi_VN',  // Changed to Vietnamese locale
            client_country_code: 'VN',  // Changed to Vietnam
            credentials_type: 'device_based_login_password',
            generate_session_cookies: '1',
            generate_analytics_claim: '1',
            generate_machine_id: '1',
            currently_logged_in_userid: '0',
            try_num: "1",
            enroll_misauth: "false",
            meta_inf_fbmeta: "NO_FILE",
            source: 'login',
            machine_id: this.generateMachineId(),
            fb_api_req_friendly_name: 'authenticate',
            fb_api_caller_class: 'com.facebook.account.login.protocol.Fb4aAuthHandler',
            api_key: '882a8490361da98702bf97a021ddc14d',
            access_token: '275254692598279|585aec5b4c27376758abb7ffcb9db2af'
        };

        form.sig = this.generateSignature(this.sortObject(form));
        return form;
    }

    processCookies(sessionCookies) {
        const now = new Date();
        const defaultCookieOptions = {
            domain: "facebook.com",
            path: "/",
            hostOnly: false,
            creation: now.toISOString(),
            lastAccessed: now.toISOString()
        };

        // Define standard cookies that might not be in session_cookies
        const additionalCookies = {
            ps_l: "1",
            ps_n: "1",
            locale: "vi_VN",
            wd: "1440x739"
        };

        // Convert session cookies to required format
        const formattedCookies = sessionCookies.map(cookie => ({
            key: cookie.name,
            value: cookie.value,
            ...defaultCookieOptions,
            path: cookie.name === 'dbln' ? '/login/device-based/' : '/'
        }));

        // Add additional standard cookies
        Object.entries(additionalCookies).forEach(([key, value]) => {
            formattedCookies.push({
                key,
                value,
                ...defaultCookieOptions
            });
        });

        return formattedCookies;
    }

    async handleTwoFactorAuth(error, originalForm, otpKey) {
        const data = error.response.data.error.error_data;
        const twoFactorForm = {
            ...originalForm,
            twofactor_code: totp(decodeURI(otpKey).replace(/\s+/g, '').toLowerCase()),
            encrypted_msisdn: "",
            userid: data.uid,
            machine_id: data.machine_id,
            first_factor: data.login_first_factor,
            credentials_type: "two_factor"
        };

        delete twoFactorForm.sig;
        twoFactorForm.sig = this.generateSignature(this.sortObject(twoFactorForm));

        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.sendRequest(twoFactorForm);
    }

    async sendRequest(form) {
        const options = {
            url: this.apiUrl,
            method: 'post',
            data: form,
            transformRequest: [
                (data, headers) => querystring.stringify(data)
            ],
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'x-fb-friendly-name': form.fb_api_req_friendly_name,
                'x-fb-http-engine': 'Liger',
                'user-agent': this.userAgent
            }
        };

        return axios(options);
    }

    async login(credentials) {
        try {
            if (this.config.ACCESSTOKEN) {
                return { success: true, accessToken: this.config.ACCESSTOKEN };
            }

            if (!credentials.email || !credentials.password) {
                throw new Error('Missing email or password');
            }

            const form = this.buildLoginForm(credentials);
            try {
                const response = await this.sendRequest(form);
                const cookies = this.processCookies(response.data.session_cookies);

                if (response.data.access_token) {
                    this.config.ACCESSTOKEN = response.data.access_token;
                    return {
                        success: true,
                        accessToken: response.data.access_token,
                        cookies,
                        uid: cookies.find(c => c.key === 'c_user')?.value,
                        sessionData: response.data
                    };
                }
            } catch (error) {
                if (error.response?.data?.error?.error_data && credentials.otpKey) {
                    const twoFactorResponse = await this.handleTwoFactorAuth(
                        error,
                        form,
                        credentials.otpKey
                    );

                    const cookies = this.processCookies(twoFactorResponse.data.session_cookies);

                    if (twoFactorResponse.data.access_token) {
                        this.config.ACCESSTOKEN = twoFactorResponse.data.access_token;
                        return {
                            success: true,
                            accessToken: twoFactorResponse.data.access_token,
                            cookies,
                            uid: cookies.find(c => c.key === 'c_user')?.value,
                            sessionData: twoFactorResponse.data
                        };
                    }
                }
                throw error;
            }
        } catch (error) {
            return {
                success: false,
                error: error.response?.data || error.message,
                details: error
            };
        }
    }
}

module.exports = FacebookAuth;