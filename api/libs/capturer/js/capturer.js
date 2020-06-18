if (window.capturer === undefined) {
    (function() {
    	function load(map, callback) {
            var capture_id = "capturer_" + (new Date())*1,
                captureHtml = '',
                camera_id = "camera_" + (new Date())*1,
                cameraHtml = '',
                resource_id = "resource_" + (new Date())*1,
                resourceHtml = '';

            if(!map.capturerControl) {
                map = {capturerControl: map}
            }

            captureHtml += '<form action="/capture/save/image" enctype="multipart/form-data" method="post" class="capturer">'
            captureHtml += '<input accept="image/*" name="' + capture_id + '" id="' + capture_id + '" type="file" multiple />'
            captureHtml += '<input type="submit" value="Upload"=/>'
            captureHtml += '</form>'
            map.capturerControl.innerHTML = captureHtml;

            var $captureInput = document.getElementById(capture_id)
                , $captureForm = $captureInput.parentElement
                , $captureSubmit = $captureInput.nextElementSibling
                , $capturerButton = document.getElementById("capturerButton")
            ;

            if($capturerButton) {
                $capturerButton.addEventListener('click', function(e){
                  $captureInput.click(e);
                });
            }

            $captureInput.addEventListener('change', function(e){
                if(this.files.length === 0) return;
                setTimeout(function() {
                    $captureSubmit.click()
                }, 1);
            });

            $captureForm.addEventListener('submit', function(e) {
                var formData = new FormData($captureForm);
                e.preventDefault();
                window.restfull.post({
                    path: this.getAttribute('action'),
                    data: formData,
                    contentType: false
                }, function(err, response) {
                    if(callback) return callback(null, response);
                    location.href = "/explore/section";
                })
            });


            if(map.resourcerControl) {
                resourceHtml += '<form action="/capture/save/resource" enctype="multipart/form-data" method="post" class="capturer">'
                resourceHtml += '<input accept="*" name="' + resource_id + '" id="' + resource_id + '" type="file" multiple />'
                resourceHtml += '<input type="submit" value="Upload" />'
                resourceHtml += '</form>'
                map.resourcerControl.innerHTML = resourceHtml;

                var $resourceInput = document.getElementById(resource_id)
                    , $resourceForm = $resourceInput.parentElement
                    , $resourceSubmit = $resourceInput.nextElementSibling
                    , $resourceButton = document.getElementById('resourceButton')
                ;

                $resourceButton.addEventListener('click', function(e){
                    $resourceInput.click(e);
                });

                $resourceInput.addEventListener('change', function(e){
                    e.preventDefault();
                    if(this.files.length === 0) return;
                    setTimeout(function() {
                        $resourceSubmit.click()
                    }, 1);
                });
                $resourceForm.addEventListener('submit', function(e) {
                    var formData = new FormData($resourceForm);
                    e.preventDefault();
                    window.restfull.post({
                        path: this.getAttribute('action'),
                        data: formData,
                        contentType: false
                    }, function(err, response){
                        location.href = "/explore/section";
                    })
                });
            }

            if(map.cameraControl) {
                cameraHtml += '<form action="/capture/save/resource" enctype="multipart/form-data" method="post" class="capturer">'
                cameraHtml += '<input accept="*" name="' + camera_id + '" id="' + camera_id + '" type="file" multiple />'
                cameraHtml += '<input type="submit" value="Upload" />'
                cameraHtml += '</form>'
                map.cameraControl.innerHTML = cameraHtml;

                var $cameraInput = document.getElementById(camera_id)
                    , $cameraForm = $cameraInput.parentElement
                    , $cameraSubmit = $cameraInput.nextElementSibling
                    , $cameraButton = document.getElementById('cameraButton')
                ;

                $cameraButton.addEventListener('click', function(e){
                    $cameraInput.click(e);
                });

                $cameraInput.addEventListener('change', function(e){
                    e.preventDefault();
                    if(this.files.length === 0) return;
                    setTimeout(function() {
                        $cameraSubmit.click()
                    }, 1);
                });
                $cameraForm.addEventListener('submit', function(e) {
                    var formData = new FormData($cameraForm);
                    e.preventDefault();
                    window.restfull.post({
                        path: this.getAttribute('action'),
                        data: formData,
                        contentType: false
                    }, function(err, response){
                        document.querySelector('body').innerHTML = response;
                    })
                });
            }
      };
      window.capturer = {
        load: load
      }
    }());
}
