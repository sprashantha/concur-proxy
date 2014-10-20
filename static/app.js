    var app = angular.module('concurApp', ['ngRoute']);


    app.config(function($routeProvider, $httpProvider){
        $routeProvider
            .when('/', {
                templateUrl:'home.html',
                controller: 'homeController'
            })
            .when('/login', {
                templateUrl:'login.html',
                controller: 'loginController'
            })
            .when('/home', {
                templateUrl: 'home.html',
                controller: 'homeController'
            })
    });

    app.controller("homeController", function($scope,$http){
        $http.get("/concur/api/home")
            .success(function(response) {$scope.home = response;});
    });

    app.controller('LoginController', function ($scope, $http, $location) {
        $scope.credentials = {
            username: '',
            password: ''
        };
        $scope.login = function () {
            $http
                .post('/concur/api/login', $scope.credentials)
                .success(function(data){
                    var token = data.token;
                    $cookieStore.put('token', token);
                    $scope.message = 'Login success';
                    $location.path('/');
                })
                .error(function (data) {
                    $cookieStore.remove('token');
                    $scope.message = 'Error: Invalid user or password';
                })
        };
    });



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