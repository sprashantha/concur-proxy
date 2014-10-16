    var app = angular.module('concurApp', ['ngRoute']);


    app.config(function($routeProvider){
        $routeProvider
            .when('/', {
                templateUrl:'home.html',
                controller: 'homeController'
            })
    });

    app.controller("homeController", function($scope,$http){
        $http.get("/concur/api/home")
            .success(function(response) {$scope.home = response;});
    });

