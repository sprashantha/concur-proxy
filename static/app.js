    var app = angular.module('concurApp', ['ngRoute']);


    app.config(function($routeProvider){
        $routeProvider
            .when('/', {
                templateUrl:'home.html',
                controller: 'homeController'
            })
            .when('/login', {
                templateUrl:'login.html',
                controller: 'loginController'
            })
    });

    app.controller("homeController", function($scope,$http){
        $http.get("/concur/api/home")
            .success(function(response) {$scope.home = response;});
    });

    app.controller("loginController", function($scope,$http){
        $scope.message = "Hello Login";
    });

