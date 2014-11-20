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
        .when('/logout', {
            templateUrl:'login.html',
            controller: 'loginController'
        })
        .when('/home', {
            templateUrl: 'home.html',
            controller: 'homeController'
        })
        .when('/trips', {
            templateUrl: 'trips.html',
            controller: 'tripsController'
        })
        .when('/expenses', {
            templateUrl: 'reports.html',
            controller: 'expenseController'
        })
        .when('/approvals', {
            templateUrl: 'approvals.html',
            controller: 'approvalsController'
        })
        .when('/approvals/:reportId', {
            templateUrl: 'approvalDetails.html',
            controller: 'approvalDetailsController'
        })

});


app.controller("homeController", function($scope,$rootScope,$http){
    $http({method: 'GET', url: '/concur/api/home', headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.home = response;});
});

app.controller("tripsController", function($scope,$rootScope,$http){
    $http({method: 'GET', url: '/concur/api/trips', headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.trips = response;});
});

app.controller("expenseController", function($scope,$rootScope,$http){
    $http({method: 'GET', url: '/concur/api/reports', headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.reports = response;});
});

app.controller("approvalsController", function($scope,$rootScope,$http){
    $http({method: 'GET', url: '/concur/api/approvals', headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.approvals = response;});
});

app.controller("approvalDetailsController", function($scope,$rootScope,$http, $routeParams){
    $http({method: 'GET', url: '/concur/api/approvals/' + $routeParams.reportId, headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.approvalDetail = response;});
});

app.controller("workflowController", function($scope,$rootScope, $http){
    $scope.approveReport = function(){
        $http({method: 'POST',
            url: '/concur/api/approvals/' + $scope.approvalDetail.ReportID,
            headers: {'authorization': $rootScope.token},
            data: {"WorkflowAction": {"Action": "Approve", "Comment": "Approved via Concur Connect"}}})
            .success(function(response){
                $scope.message = response;
                $location.path('/approvals');
            });
    }
});


app.controller("logoutController", function($scope,$rootScope,$http){
    $rootScope.remove("token");
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
