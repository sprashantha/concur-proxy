var app = angular.module('concurApp', ['ngRoute']);


app.config(function($routeProvider){
    $routeProvider
        .when('/', {
            templateUrl:'home.html',
            controller: 'homeController',
            resolve: {
                homeData: function(homeService){
                    return homeService.getHomeData();
                }
            }
        })
});

app.factory('homeService', function($http){
    return {
        getHomeData: function(){
            var promise = $http({ method: 'GET', url: 'concur/api/home' }).success(function(data) {
                return data;
            });
            return promise;
        }
    }
})

app.controller("homeController", function($scope,homeData){
    $scope.home = homeData.data;
});
