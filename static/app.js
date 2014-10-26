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


app.controller("homeController", function($scope,$rootScope,$http){
    $http({method: 'GET', url: '/concur/api/home', headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.home = response;});
});

app.controller('loginController', function ($scope, $rootScope, $http, $location) {
    $scope.credentials = {
        username: '',
        password: ''
    };
    $scope.login = function () {
        $http
            .post('/concur/api/login', $scope.credentials)
            .success(function(data){
                var token = data.value;
                $rootScope.token = token;
                $rootScope.isLoggedIn = 'true'
                $location.path('/');
            })
            .error(function (data) {
                $rootScope.remove("token");
                $rootScope.remove("isLoggedIn");
                $scope.message = 'Error: Invalid user or password';
            })
    };
});

app.run(function($rootScope, $location) {

    // register listener to watch route changes
    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
        if ( !$rootScope.token) {
            // no token, we should be going to #login
            if ( next.templateUrl == "login.html" ) {
                // already going to #login, no redirect needed
            } else {
                // not going to #login, we should redirect now
                $location.path( "/login" );
            }
        }
    });
});
