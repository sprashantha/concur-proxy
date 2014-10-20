    var app = angular.module('concurApp', ['ngRoute']);

    app.controller('LoginController', function ($scope, $rootScope, AUTH_EVENTS, AuthService) {
        $scope.credentials = {
            username: '',
            password: ''
        };
        $scope.login = function (credentials) {
            AuthService.login(credentials).then(function (user) {
                $rootScope.$broadcast(AUTH_EVENTS.loginSuccess);
                $scope.setCurrentUser(user);
            }, function () {
                $rootScope.$broadcast(AUTH_EVENTS.loginFailed);
            });
        };
    })

        app.constant('AUTH_EVENTS', {
            loginSuccess: 'auth-login-success',
            loginFailed: 'auth-login-failed',
            logoutSuccess: 'auth-logout-success',
            sessionTimeout: 'auth-session-timeout',
            notAuthenticated: 'auth-not-authenticated',
            notAuthorized: 'auth-not-authorized'
        })

           app.factory('AuthService', function ($http, Session) {
                var authService = {};

                authService.login = function (credentials) {
                    return $http
                        .post('/concur/api/login', credentials)
                        .then(function (res) {
                            Session.create(res.data.id, res.data.user.id,
                                res.data.user.role);
                            return res.data.user;
                        });
                };

                authService.isAuthenticated = function () {
                    return !!Session.userId;
                };

                return authService;
            })

               app.service('Session', function () {
                   this.create = function (sessionId, userId, userRole) {
                       this.id = sessionId;
                       this.userId = userId;
                   };
                   this.destroy = function () {
                       this.id = null;
                       this.userId = null;
                   };
                   return this;
               })