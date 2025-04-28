const config = {
    apiPath: 'https://coffee-api-9lij.onrender.com',
    headers: () => {
        return {
            headers: {
                Authorization: localStorage.getItem('token')
            }
        }
    }
}

export default config;