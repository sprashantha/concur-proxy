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

app.controller("imagesController", function($scope,$rootScope,$http){
    $http({method: 'GET', url: '/imaging/v4/images', headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.images = response;});
});

app.controller("imageDetailsController", function($scope,$rootScope,$http, $routeParams){
    $scope.imageId = $routeParams.imageId;
});

app.controller("imageUploadController", function($scope,$rootScope, $http, $location){
    $scope.imageId = $routeParams.imageId;
});


app.controller("approvalsController", function($scope,$rootScope,$http){
    $http({method: 'GET', url: '/concur/api/approvals', headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.approvals = response;});
});

app.controller("approvalDetailsController", function($scope,$rootScope,$http, $routeParams){
    $http({method: 'GET', url: '/concur/api/approvals/' + $routeParams.reportId, headers: {'authorization': $rootScope.token}})
        .success(function(response){$scope.approvalDetail = response;});
});

app.controller("workflowController", function($scope,$rootScope, $http, $location){
    $scope.approveReport = function(){
        $scope.loading = true;
        $http({method: 'POST',
            url: '/concur/api/approvals/' + $scope.approvalDetail.ReportID,
            headers: {'authorization': $rootScope.token},
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

app.controller("uploadController", function($scope,$rootScope, $http, $location){
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
                    headers: {'authorization': $rootScope.token},
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


app.controller("logoutController", function($scope,$rootScope,$http){
    $rootScope.remove("token");
    $rootScope.remove("tokenUrlEncoded");
});

app.controller('loginController', function ($scope, $rootScope, $http, $location) {
    $scope.credentials = {
        username: '',
        password: ''
    };
    $scope.login = function () {
        $http
            .post('/login', $scope.credentials)
            .success(function(data){
                var token = data.value;
                $rootScope.token = token;
                $rootScope.tokenUrlEncoded = encodeURIComponent(token);
                $rootScope.isLoggedIn = 'true'
                $location.path('/');
            })
            .error(function (data) {
                $rootScope.remove("token");
                $rootScope.remove("tokenUrlEncoded");
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

