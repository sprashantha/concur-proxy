var app = angular.module('concurApp', ['ngRoute']);

app.factory('tokenService', function(){
    var tokenService = {};
    tokenService.token = '';

    tokenService.clear = function(){
        this.token = '';
    }

    return tokenService;
});

app.factory('authService', ['$http', 'tokenService', function($http, tokenService){
    var authService = {};

    authService.login = function(credentials){
        return $http
            .post('/login', credentials)
            .success(function(data){
                tokenService.token = data.value;
            })
            .error(function (data) {
                tokenService.clear();
            })
    };

    authService.logout = function(){
        tokenService.clear();
    }

    authService.isAuthenticated = function(){
        return (tokenService.token != '');
    }

    return authService;
}]);

app.controller('loginController', ['$scope','$http', '$location', 'authService', function ($scope, $http, $location, authService) {
    $scope.credentials = {
        username: '',
        password: ''
    };
    $scope.login = function (credentials) {
        authService.login(credentials).then(function () {
            $location.path('/');
        }, function () {
            $scope.message = 'Error: Invalid user or password';
        });
    };
}]);

app.controller("logoutController", function($scope, $http, authService){
    authService.logout();
});


app.run(function($rootScope, $location, authService) {

    // register listener to watch route changes
    $rootScope.$on( "$routeChangeStart", function(event, next, current) {
        if ( authService && !authService.isAuthenticated()) {
            // not authenticated, we should be going to #login
            if ( next.templateUrl == "login.html" ) {
                // already going to #login, no redirect needed
            } else {
                // not going to #login, we should redirect now
                $location.path( "/login" );
            }
        }
    });
});



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
        .when('/images', {
            templateUrl: 'images.html',
            controller: 'imagesController'
        })
        .when('/images/:imageId', {
            templateUrl: 'imageDetails.html',
            controller: 'imageDetailsController'
        })
        .when('/imageUpload', {
            templateUrl: 'imageUpload.html',
            controller: 'imageUploadController'
        })

});


app.controller("homeController", function($scope,tokenService, $http){
    $http({method: 'GET', url: '/home/v4/portal', headers: {'authorization': tokenService.token}})
        .success(function(response){$scope.home = response;});
});

app.controller("tripsController", function($scope, tokenService, $http){
    $http({method: 'GET', url: '/travel/v4/trips', headers: {'authorization': tokenService.token}})
        .success(function(response){$scope.trips = response;});
});

app.controller("expenseController", function($scope,tokenService,$http){
    $http({method: 'GET', url: '/expense/v4/reports', headers: {'authorization': tokenService.token}})
        .success(function(response){$scope.reports = response;});
});

app.controller("imagesController", function($scope,tokenService,$http){
    $scope.token = tokenService.token;
    $scope.tokenUrlEncoded = encodeURIComponent(tokenService.token);
    $http({method: 'GET', url: '/imaging/v4/images', headers: {'authorization': tokenService.token}})
        .success(function(response){$scope.images = response;});
});

app.controller("imageDetailsController", function($scope,tokenService,$http, $routeParams){
    $scope.token = tokenService.token;
    $scope.tokenUrlEncoded = encodeURIComponent(tokenService.token);
    $scope.imageId = $routeParams.imageId;
});

app.controller("imageUploadController", function($scope,tokenService, $http, $location){
    $scope.token = tokenService.token;
    $scope.tokenUrlEncoded = encodeURIComponent(tokenService.token);
    $scope.imageId = $routeParams.imageId;
});


app.controller("approvalsController", function($scope,tokenService,$http){
    $http({method: 'GET', url: '/expense/v4/approvals/reports', headers: {'authorization': tokenService.token}})
        .success(function(response){$scope.approvals = response;});
});

app.controller("approvalDetailsController", function($scope,tokenService,$http, $routeParams){
    $http({method: 'GET', url: '/expense/v4/approvals/reports/' + $routeParams.reportId, headers: {'authorization': tokenService.token}})
        .success(function(response){$scope.approvalDetail = response;});
});

app.controller("workflowController", function($scope,tokenService, $http, $location){
    $scope.approveReport = function(){
        $scope.loading = true;
        $http({method: 'POST',
            url: '/expense/v4/approvals/reports/' + $scope.approvalDetail.reportID + '/workflow',
            headers: {'authorization': tokenService.token},
            data: {"WorkflowAction": {"Action": "Approve", "Comment": "Approved via Concur Connect"}}})
            .success(function(response){
                if (response){
                    alert(" Approval Status: " + response.STATUS);
                    $scope.loading = false;
                    $location.path('/approvals');
                }

            });
    }
});

app.controller("uploadController", function($scope,tokenService, $http, $location){
    $scope.add = function(){
        $scope.loading = true;
        $scope.add = function(){
            alert("Add Called");
            var f = document.getElementById('file').files[0],
                r = new FileReader();
            r.onloadend = function(e){
                var data = e.target.result;
                //send you binary data via $http or $resource or do anything else with it
                $http({method: 'POST',
                    url: '/imaging/v4/images',
                    headers: {'authorization': tokenService.token},
                    data: data})
                    .success(function(response){
                        if (response){
                            alert(" Upload Status: ");
                            $scope.loading = false;
                            $location.path('/images');
                        }

                    });
            }
            r.readAsBinaryString(f);
        }
    }
});
