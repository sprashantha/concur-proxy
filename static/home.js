    var app = angular.module('concurApp', ['ngRoute']);

    app.controller("homeController", function($scope,$http){
        $http.get("/concur/api/home")
            .success(function(response) {$scope.home = response;});
    });
