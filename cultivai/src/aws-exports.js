const awsExports = {
  Auth: {
    Cognito: {
      userPoolId: 'eu-north-1_0rMffvOo6',
      userPoolClientId: '3ktmjs04suupvi40f1h8le0or3',
      signUpVerificationMethod: 'code',
      loginWith: { 
        email: true, 
        username: false, 
        phone: false,
        oauth: {
          domain: 'eu-north-10rmffvoo6.auth.eu-north-1.amazoncognito.com',
          scopes: ['email', 'openid', 'profile'], 
          redirectSignIn: ['http://localhost:3000/dashboard'],
          redirectSignOut: ['http://localhost:3000/login'],
          responseType: 'code',
          providers: ['Google']
        }
      }
    }
  }
};

export default awsExports;