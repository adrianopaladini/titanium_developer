PackageProject = {};
PackageProject.currentProject = null;
PackageProject.packageWindow = null;
PackageProject.mobileWindow = null;
PackageProject.currentAppPID = null;
PackageProject.currentIPhonePID = null;
PackageProject.currentAndroidPID = null;
PackageProject.currentAndroidEmulatorPID = null;
PackageProject.publishURL = "publish";
PackageProject.publishStatusURL = "publish-status";
PackageProject.isAndroidEmulatorRunning = false;
PackageProject.iPhoneDevPrereqs = {};


// Mobile Script vars
PackageProject.iPhoneEmulatorPath = null;
PackageProject.AndroidEmulatorPath = null;
PackageProject.iPhonePrereqPath = null;
PackageProject.AndroidPrereqPath = null;
PackageProject.MobileProjectPath = null;
PackageProject.iPhoneProvisioningPath = null;
PackageProject.iphoneSDKs = null;

// Desktop Script var
PackageProject.desktopPackage = null;

// distribution iphone validator
PackageProject.iPhoneDistValidator = null; 


//
// add close listener to close emulators if still running
//
Titanium.UI.currentWindow.addEventListener(function(name,event)
{
	if (name == 'closed')
	{
		if (PackageProject.currentIPhonePID != null)
		{
			PackageProject.currentIPhonePID.terminate();
		}
		if (PackageProject.currentAndroidPID != null)
		{
			PackageProject.currentAndroidPID.terminate();
		}
		if (PackageProject.currentAndroidEmulatorPID != null)
		{
			PackageProject.currentAndroidEmulatorPID.terminate();
		}
		
	}
});

//
// Setup row selection listener
//
$MQL('l:tidev.projects.row_selected',function(msg)
{
	if (msg.payload.activeTab == 'packaging')
	{
		PackageProject.currentProject = Projects.getProject();
		var file = Titanium.Filesystem.getFile(Titanium.App.appURLToPath('modules/packaging/packaging.html'));
		$('#tiui_content_right').get(0).innerHTML = file.read();

		if (PackageProject.currentProject.type == 'mobile')
		{
			PackageProject.setupMobileView();
			
		}
		else
		{
			PackageProject.setupDesktopView();
		}
	}
});

//
// View setup
//
PackageProject.setupView = function()
{
	TiUI.setBackgroundColor('#1c1c1c');

	TiDev.contentLeft.show();
	TiDev.contentLeftHideButton.show();
	TiDev.contentLeftShowButton.hide();	
	
	// get current project
	PackageProject.currentProject = Projects.getProject();

	if (PackageProject.currentProject.type == 'mobile')
	{
		PackageProject.setupMobileView();
	}
	// setup desktop elements
	else
	{
		PackageProject.setupDesktopView();
	}
};

//
// Setup view for mobile project
//
PackageProject.setupMobileView = function()
{
	// set mobile packaging vars
	var runtime = PackageProject.currentProject.runtime;
	var sdk = Titanium.Project.getMobileSDKVersions(runtime);
	
	// set scripts for current sdk version
	PackageProject.iPhoneEmulatorPath = Titanium.Filesystem.getFile(sdk.getPath(),'/iphone/builder.py');
	PackageProject.AndroidEmulatorPath = Titanium.Filesystem.getFile(sdk.getPath(),'/android/builder.py');
	PackageProject.iPhoneProvisioningPath = Titanium.Filesystem.getFile(sdk.getPath(),'iphone/provisioner.py');
	PackageProject.iPhonePrereqPath = Titanium.Filesystem.getFile(sdk.getPath(),'iphone/prereq.py');
	PackageProject.AndroidPrereqPath = Titanium.Filesystem.getFile(sdk.getPath(),'android/prereq.py');

	// show correct view
	$('#mobile_packaging').css('display','block');
	$('#desktop_packaging').css('display','none');
	
	// setup tabs for "device"
	$('#tab_iphone_dev').click(function()
	{
		$('.help_header.tab.device').removeClass('active');
		$(this).addClass('active');
		$('#mobile_device_content_iphone').css('display','block');
		$('#mobile_device_content_android').css('display','none');
		
	});
	$('#tab_android_dev').click(function()
	{
		$('.help_header.tab.device').removeClass('active')
		$(this).addClass('active')
		$('#mobile_device_content_iphone').css('display','none');
		$('#mobile_device_content_android').css('display','block');
		
	});

	// setup tabs for "packaging"
	$('#tab_iphone_package').click(function()
	{
		$('.help_header.tab.packaging').removeClass('active');
		$(this).addClass('active');
		$('#mobile_packaging_content_iphone').css('display','block');
		$('#mobile_packaging_content_android').css('display','none');
		
	});
	$('#tab_android_package').click(function()
	{
		$('.help_header.tab.packaging').removeClass('active')
		$(this).addClass('active')
		$('#mobile_packaging_content_iphone').css('display','none');
		$('#mobile_packaging_content_android').css('display','block');
		
	});
	
	// check project for iphone
	if (Titanium.Filesystem.getFile(PackageProject.currentProject.dir, 'build','iphone').exists() == true)
	{		
		// setup distribution validation
		PackageProject.iPhoneDistValidator = TiUI.validator('iphone_dist',function(valid)
		{
			// now check field
			if (valid) 
			{
				$('#iphone_package_button').removeClass('disabled');
			}
			else
			{
				$('#iphone_package_button').addClass('disabled');
			}
		});
		
		// retrieve distribution location
		var location = PackageProject.getIPhoneAttribute('dist_location');
		if (location != null) $('#iphone_dist_location').val(location);
		
		// distribution provisioning profile link
		$('#upload_dist_profile_link').click(function()
		{
			PackageProject.uploadIPhoneProvisioningProfile('distribution_profile', function(r)
			{
				if (r.result == true)
				{
					// show select
					$('.not_found.dist_profile').css('display','none');
					$('.found.dist_profile').css('display','block');

					// we have a profile so hide other stuff that can be inferred
					$('#dist_iphone_signup').css('display','none');
					$('.register_phone').css('display','none');

					// update select
					PackageProject.updateProvisioningSelect('iphone_dist_profile_select',
						PackageProject.getIPhoneProvisioningProfiles('distribution'),r.appid);
					
					// reset console
					TiDev.resetConsole();

					// update state var
					PackageProject.iPhoneDevPrereqs['iphone_dist_profile'] = true;

					// check state
					PackageProject.checkIPhoneDistPrereqs();
					
				}
				else
				{
					TiDev.setConsoleMessage('Unexpected Error: unable to load provisioning profile.  Please try again.',2000);
				}
			});
		});

		// add dist cert select listener (distribution)
		$('#iphone_dist_cert_select').change(function()
		{
			if ($(this).val()=='')return;
			PackageProject.setIPhoneAttribute('dist_name',$(this).val());
		});

		// add provisioning profile select listener (distribution)
		$('#iphone_dist_profile_select').change(function()
		{
			if ($(this).val()=='')return;

			// need to find UUID for selected profile
			var row = TiDev.db.execute('SELECT UUID FROM IPHONE_PROVISIONING_PROFILES WHERE APPID = ? AND TYPE = "distribution"', $(this).val())
			while (row.isValidRow())
			{
				PackageProject.setIPhoneAttribute('dist_uuid',row.field(0));
				break;
			}

			PackageProject.setIPhoneAttribute('distribution_profile',$(this).val());
			PackageProject.iPhoneDevPrereqs['iphone_dist_profile'] = true;					
			PackageProject.checkIPhoneDistPrereqs();
				
			// update project
			PackageProject.updateMobileAppId($(this).val());
		});
		
		// add new provisioning profile even if you have a valid one (distribution)
		$('#add_dist_profile_link').click(function()
		{
			PackageProject.uploadIPhoneProvisioningProfile('distribution_profile', function(r)
			{
				if (r.result == true)
				{
					// update select
					PackageProject.updateProvisioningSelect('iphone_dist_profile_select',
						PackageProject.getIPhoneProvisioningProfiles('distribution'),r.appid);
						
					// update project
					PackageProject.setIPhoneAttribute('distribution_profile',r.appid);

					// update project
					PackageProject.updateMobileAppId(r.appid);
					
					// reset message console	
					TiDev.resetConsole();

				}
				else
				{
					TiDev.setConsoleMessage('Unexpected Error: unable to load provisioning profile.  Please try again.',2000);
				}
			});
		});

		// add dev cert select listener (development)
		$('#iphone_dev_cert_select').change(function()
		{
			if ($(this).val()=='')return;
			PackageProject.setIPhoneAttribute('dev_name',$(this).val());
		});

		// add provisioning profile select listener (Development)
		$('#iphone_dev_profile_select').change(function()
		{
			if ($(this).val()=='')return;
			
			// need to find UUID for selected profile
			var row = TiDev.db.execute('SELECT UUID FROM IPHONE_PROVISIONING_PROFILES WHERE APPID = ? AND TYPE = "development"', $(this).val())
			while (row.isValidRow())
			{
				PackageProject.setIPhoneAttribute('dev_uuid',row.field(0));
				break;
			}
			PackageProject.setIPhoneAttribute('development_profile',$(this).val());
			PackageProject.updateMobileAppId($(this).val());
			// update state var
			PackageProject.iPhoneDevPrereqs['iphone_dev_profile'] = true;

			// check state
			PackageProject.checkIPhoneDevPrereqs();
		
		});
		
		// add new provisioning profile even if you have a valid one
		$('#add_dev_profile_link').click(function()
		{
			PackageProject.uploadIPhoneProvisioningProfile('development_profile', function(r)
			{
				if (r.result == true)
				{
					// update select
					PackageProject.updateProvisioningSelect('iphone_dev_profile_select',
						PackageProject.getIPhoneProvisioningProfiles('development'),r.appid);
						
					PackageProject.setIPhoneAttribute('development_profile',r.appid);
					
					// update project
					PackageProject.updateMobileAppId(r.appid);
					
					// reset message console	
					TiDev.resetConsole();

				}
				else
				{
					TiDev.setConsoleMessage('Unexpected Error: unable to load provisioning profile.  Please try again.',2000);
				}
			});
		});
		
		// add initial dev provisioning profile
		$('#upload_dev_profile_link').click(function()
		{
			PackageProject.uploadIPhoneProvisioningProfile('development_profile', function(r)
			{
				if (r.result == true)
				{
					// show select
					$('.not_found.dev_profile').css('display','none');
					$('.found.dev_profile').css('display','block');

					// we have a profile so hide other stuff that can be inferred
					$('#dev_iphone_signup').css('display','none');
					$('.register_phone').css('display','none');

					// update select
					PackageProject.updateProvisioningSelect('iphone_dev_profile_select',
						PackageProject.getIPhoneProvisioningProfiles('development'),r.appid);
					
					// reset console
					TiDev.resetConsole();

					// update state var
					PackageProject.iPhoneDevPrereqs['iphone_dev_profile'] = true;

					// check state
					PackageProject.checkIPhoneDevPrereqs();
					
				}
				else
				{
					TiDev.setConsoleMessage('Unexpected Error: unable to load provisioning profile.  Please try again.',2000);
				}
			});
		});
		
		// see what iphone prereqs the user has then drive UI state
		var x = TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.iPhonePrereqPath).toString(),['package']);
		x.onread = function(d)
		{
			try
			{
				var json = swiss.evalJSON(d);

				// set prereq vars
				PackageProject.iPhoneDevPrereqs['itunes'] = json['itunes'];
				PackageProject.iPhoneDevPrereqs['wwdr'] = json['wwdr'];
				PackageProject.iPhoneDevPrereqs['iphone_dev'] = json['iphone_dev'];
				PackageProject.iPhoneDevPrereqs['iphone_dist'] = json['iphone_dist'];
				PackageProject.iPhoneDevPrereqs['iphone_dist_name'] = json['iphone_dist_name'];
				
				// set SDK dropdowns
				PackageProject.iphoneSDKs  = json.sdks;
				if (json.sdks)
				{
					var html = '';
					for(var i=0;i<json.sdks.length;i++)
					{
						if (json.sdks[i] == '3.0')
						{
							html += '<option value="'+json.sdks[i]+'" selected>'+json.sdks[i] + '</option>';
						}
						else
						{
							html += '<option value="'+json.sdks[i]+'">'+json.sdks[i] + '</option>';
						}
					}
					$('#iphone_emulator_sdk').html(html);
					$('#iphone_device_sdk').html(html);
					$('#iphone_distribution_sdk').html(html);
					
				}
				// correct version of iTunes
				if (json['itunes'] == true)
				{
					$('.found.itunes').css('display','inline');
					$('.not_found.itunes').css('display','none');
				}
				else
				{
					$('.found.itunes').css('display','none');
					$('.not_found.itunes').css('display','inline');
				}

				// wwdr intermediate certificate
				if (json['wwdr'] == true)
				{
					$('.found.wwdr').css('display','inline');
					$('.not_found.wwdr').css('display','none');	
					$('#dev_iphone_signup').css('display','none');
					$('#package_iphone_signup').css('display','none');
				}
				else
				{
					$('.found.wwdr').css('display','none');
					$('.not_found.wwdr').css('display','inline');				
				}

				// iphone development certificate
				if (json['iphone_dev'] == true)
				{
					if (json['iphone_dev_name'].length > 1)
					{
						// display drop down and update values
						$('.found.dev_cert_multiple').css('display','inline');
						$('.found.dev_cert').css('display','none');
						var html = '';
						var distName = PackageProject.getIPhoneAttribute('dev_name');
						if (distName == null)
						{
							html += '<option value="">Select a Development Certificate</option>';
						}
						for (var i=0;i<json['iphone_dev_name'].length;i++)
						{
							if (distName == json['iphone_dev_name'][i])
							{
								html += '<option value="'+json['iphone_dev_name'][i] +'" selected>'+json['iphone_dev_name'][i]+'</option>';							
							}
							else
							{
								html += '<option value="'+json['iphone_dev_name'][i] +'" >'+json['iphone_dev_name'][i]+'</option>';							
							}
						}
						$('#iphone_dev_cert_select').html(html);
					}
					else if (json['iphone_dev_name'].length == 1)
					{
						// update dist name
						PackageProject.setIPhoneAttribute('dev_name',json['iphone_dev_name']);
						
						$('#iphone_dev_cert_select').html('<option value="'+json['iphone_dev_name']+'" selected>'+json['iphone_dev_name']+'</option>');
						$('.found.dev_cert').css('display','none');
						$('.found.dev_cert_multiple').css('display','inline');
					}
					$('.not_found.dev_cert').css('display','none');
					$('#dev_iphone_signup').css('display','none');
					$('#package_iphone_signup').css('display','none');
				}
				else
				{
					$('.found.dev_cert').css('display','none');
					$('.not_found.dev_cert').css('display','block');
				}


				// iphone development certificate
				if (json['iphone_dist'] == true)
				{
					if (json['iphone_dist_name'].length > 1)
					{
						// display drop down and update values
						$('.found.dist_cert_multiple').css('display','inline');
						$('.found.dist_cert').css('display','none');
						var html = '';
						var distName = PackageProject.getIPhoneAttribute('dist_name');
						if (distName == null)
						{
							html += '<option value="">Select a Distribution Certificate</option>';
						}
						for (var i=0;i<json['iphone_dist_name'].length;i++)
						{
							if (distName == json['iphone_dist_name'][i])
							{
								html += '<option value="'+json['iphone_dist_name'][i] +'" selected>'+json['iphone_dist_name'][i]+'</option>';							
							}
							else
							{
								html += '<option value="'+json['iphone_dist_name'][i] +'" >'+json['iphone_dist_name'][i]+'</option>';							
							}
						}
						$('#iphone_dist_cert_select').html(html);
					}
					else if (json['iphone_dist_name'].length == 1)
					{
						// set (and insert dist name)
						PackageProject.setIPhoneAttribute('dist_name',json['iphone_dist_name']);
						
						$('#iphone_dist_cert_select').html('<option value="'+json['iphone_dist_name']+'" selected>'+json['iphone_dist_name']+'</option>');
						$('.found.dist_cert').css('display','none');
						$('.found.dist_cert_multiple').css('display','inline');
					}
					$('.not_found.dist_cert').css('display','none');
					$('#dev_iphone_signup').css('display','none');
					$('#package_iphone_signup').css('display','none');


				}
				else
				{
					$('.found.dist_cert').css('display','none');
					$('.not_found.dist_cert').css('display','block');
				}


				// get provisioning profiles (distribution)
				var profiles = PackageProject.getIPhoneProvisioningProfiles('distribution');
				if (profiles.length > 0)
				{
					$('.not_found.dist_profile').css('display','none');
					$('.found.dist_profile').css('display','block');

					var selectedProfile = PackageProject.getIPhoneAttribute('distribution_profile');
					if (selectedProfile == null)
					{
						PackageProject.iPhoneDevPrereqs['iphone_dist_profile'] = false;					
					}
					else
					{
						PackageProject.iPhoneDevPrereqs['iphone_dist_profile'] = true;					
					}
					PackageProject.updateProvisioningSelect('iphone_dist_profile_select',profiles, selectedProfile);
					$('#dev_iphone_signup').css('display','none');
					$('.register_phone').css('display','none');
				}
				else
				{
					$('.not_found.dist_profile').css('display','block');
					$('.found.dist_profile').css('display','none');
					PackageProject.iPhoneDevPrereqs['iphone_dist_profile'] = false;
				}

				// get provisioning profiles (development)
				var profiles = PackageProject.getIPhoneProvisioningProfiles('development');
				if (profiles.length > 0)
				{
					$('.not_found.dev_profile').css('display','none');
					$('.found.dev_profile').css('display','block');

					var selectedProfile = PackageProject.getIPhoneAttribute('development_profile');
					if (selectedProfile == null)
					{
						PackageProject.iPhoneDevPrereqs['iphone_dev_profile'] = false;					
					}
					else
					{
						PackageProject.iPhoneDevPrereqs['iphone_dev_profile'] = true;					
					}
					PackageProject.updateProvisioningSelect('iphone_dev_profile_select',profiles, selectedProfile);
					$('#dev_iphone_signup').css('display','none');
					$('.register_phone').css('display','none');
				}
				else
				{
					$('.not_found.dev_profile').css('display','block');
					$('.found.dev_profile').css('display','none');
					PackageProject.iPhoneDevPrereqs['iphone_dev_profile'] = false;
				}

				// check state
				PackageProject.checkIPhoneDevPrereqs();
				PackageProject.checkIPhoneDistPrereqs();


				
			}
			catch(e)
			{
			}
			
		};
		
		// set display of "device" section
		$('.project_has_iphone_true').css('display','block');
		$('.project_has_iphone_false').css('display','none');

		// handler for distribution location
		$('#add_dist_location_link').click(function()
		{
			var props = {multiple:false,directories:true,files:false};
			Titanium.UI.currentWindow.openFolderChooserDialog(function(f)
			{
				if (f.length)
				{
					// set file and revalidate
					$('#iphone_dist_location').val(f[0]);
					PackageProject.iPhoneDistValidator();
					PackageProject.setIPhoneAttribute('dist_location',f[0]);
				}
			},
			props);						
		});
		
		// create button for building distribution
		TiUI.GreyButton({id:'iphone_package_button'});
		$('#iphone_package_button').click(function()
		{
			if ($(this).hasClass('disabled')) return true;
			
			TiDev.setConsoleMessage('Creating distribution package...',4000);
			
			var uuid = PackageProject.getIPhoneAttribute('dist_uuid');
			var certName = PackageProject.getIPhoneAttribute('dist_name');
			var location = $('#iphone_dist_location').val();
			var sdk = $('#iphone_distribution_sdk').val();
			TiDev.track('iphone-distribute',{sdk:sdk,appid:PackageProject.currentProject.appid,name:PackageProject.currentProject.name,uuid:uuid,certName:certName});
			
			var x = TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.iPhoneEmulatorPath).toString(),['distribute','"'+sdk+'"', '"'+ PackageProject.currentProject.dir+ '"',PackageProject.currentProject.appid, '"' + PackageProject.currentProject.name+ '"', uuid,'"'+certName+'"','"'+location+'"']);
			var buffer = '';
			x.onread = function(e)
			{
				buffer += e;
			}
			x.onexit = function(e)
			{
				if (e != 0)
				{
					alert('Packaging Error\n\n' + buffer);
				}
			}
		});
		
		// create button for installing on device
		TiUI.GreyButton({id:'iphone_install_on_device_button'});
		$('#iphone_install_on_device_button').click(function()
		{
			if ($(this).hasClass('disabled'))return;
			var uuid = PackageProject.getIPhoneAttribute('dev_uuid');
			var devName = PackageProject.getIPhoneAttribute('dev_name');
			TiDev.setConsoleMessage('Installing app onto iTunes...',4000);
			
			if ($(this).hasClass('disabled')==false)
			{
				var sdk = $('#iphone_device_sdk').val();				
				TiDev.track('iphone-install',{sdk:sdk,uuid:uuid,devName:devName,appid:PackageProject.currentProject.appid,name:PackageProject.currentProject.name});
				var x = TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.iPhoneEmulatorPath).toString(),['install','"'+sdk+'"', '"'+ PackageProject.currentProject.dir+ '"',PackageProject.currentProject.appid, '"' + PackageProject.currentProject.name+ '"','"'+uuid+'"', '"'+devName + '"']);
				var buffer = '';
				x.onread = function(e)
				{
					buffer += e;
				}
				x.onexit = function(e)
				{
					if (e != 0)
					{
						alert('Install Error\n\n' + buffer);
					}
				}

			}
		});
		
		// handler iphone emulator start
		$('#mobile_emulator_iphone').click(function()
		{
			$('#mobile_iphone_emulator_viewer').css('height','347px');

			// set height
			$('#mobile_iphone_emulator_viewer').css('height','347px');
			$('#mobile_package_detail').css('height','427px');

			// set margin
			$('#mobile_package_detail').css('marginLeft','-280px');

			// set width
			$('#mobile_package_detail').css('width','auto');


			$('#packaging .option').removeClass('active');
			$(this).addClass('active');
			
			$('#mobile_android_emulator_container').css('display','none');	
			$('#mobile_iphone_emulator_container').css('display','block');
			$('#mobile_device_detail').css('display','none');	
			$('#mobile_distribution_detail').css('display','none');	
			$('#mobile_help_detail').css('display','none');


		});

		// 
		// Launch emulator
		//
		$('#iphone_launch_button').click(function()
		{
			if ($(this).hasClass('disabled'))return;
			
			$(this).addClass('disabled');
			$('#iphone_kill_button').removeClass('disabled');
			
			// clear viewer
			$('#mobile_iphone_emulator_viewer').empty();
			
			var sdk = $('#iphone_emulator_sdk').val();
			TiDev.track('iphone-simulator',{sdk:sdk,appid:PackageProject.currentProject.appid,name:PackageProject.currentProject.name});
			
			// kill if still running
			if (PackageProject.currentIPhonePID != null)
			{
				PackageProject.currentIPhonePID.terminate();
				PackageProject.currentIPhonePID = null;
			}
			PackageProject.currentIPhonePID = TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.iPhoneEmulatorPath).toString(),['simulator', '"'+sdk+'"','"'+ PackageProject.currentProject.dir+ '"',PackageProject.currentProject.appid, '"' + PackageProject.currentProject.name+ '"']);
			var buf = '';
			PackageProject.initializeConsoleWidth();
			
			PackageProject.currentIPhonePID.onread = function(d)
			{
				buf += d;
				var idx = buf.indexOf('\n');
				while (idx!=-1)
				{
					var str = buf.substring(0,idx);
					$('#mobile_iphone_emulator_viewer').append('<div style="margin-bottom:3px;">'+ str + '</div>');
					$('#mobile_iphone_emulator_viewer').get(0).scrollTop = $('#mobile_iphone_emulator_viewer').get(0).scrollHeight;
					if (idx+1 < buf.length)
					{
						buf = buf.substring(idx+1);
						idx = buf.indexOf('\n');
					}
					else
					{
						buf = '';
						break;
					}
				}
			};
			PackageProject.currentIPhonePID.onexit = function(d)
			{
				PackageProject.currentIPhonePID = null;
				$('#iphone_launch_button').removeClass('disabled');
				$('#iphone_kill_button').addClass('disabled');
				
			};
			
		});
		// create emulator buttons
		TiUI.GreyButton({id:'iphone_launch_button'});
		TiUI.GreyButton({id:'iphone_kill_button'});

		// show emulator tab and configure listeners
		$('#mobile_emulator_iphone').css('display','block');

		//TiUI.GreyButton({id:'iphone_clear_button'});
		// $('#iphone_clear_button').click(function()
		// {
		// 	$('#mobile_iphone_emulator_viewer').empty();
		// });

		$('#iphone_kill_button').click(function()
		{
			if ($(this).hasClass('disabled'))return;
			
			if (PackageProject.currentIPhonePID != null)
			{
				PackageProject.currentIPhonePID.terminate();
				PackageProject.currentIPhonePID = null;
				$(this).addClass('disabled');
				$('#iphone_launch_button').removeClass('disabled');
				
			}
		});
		
	}
	else
	{
		// otherwise setup non-iphone state
		$('#mobile_emulator_iphone').css('display','none');
		$('.project_has_iphone_true').css('display','none');
		$('.project_has_iphone_false').css('display','block');

	}
	// check project for android
	if (Titanium.Filesystem.getFile(PackageProject.currentProject.dir, 'build','android').exists() == true)
	{
		// if we don't have the android sdk dir, get it
		if (TiDev.androidSDKDir == null)
		{
			TiDev.androidSDKDir = Projects.getAndroidSDKLoc();
		}
		
		// setup proper "device" view
		$('.project_has_android_true').css('display','block');
		$('.project_has_android_false').css('display','none');
		
		// setup device button
		TiUI.GreyButton({id:'android_install_on_device_button'});
		$('#android_install_on_device_button').click(function()
		{
			TiDev.setConsoleMessage('Installing app on device...');
			TiDev.track('android-install',{name:PackageProject.currentProject.name,appid:PackageProject.currentProject.appid});
			
			var args = ["install", '"'+ PackageProject.currentProject.name+ '"','"' +TiDev.androidSDKDir+ '"', '"' + PackageProject.currentProject.dir + '"', '"'+PackageProject.currentProject.appid+'"'];
		 	var installAndroid = TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.AndroidEmulatorPath).toString(),args);
			var buffer = '';
			installAndroid.onread = function(r)
			{
				buffer += r;
			};
			installAndroid.onexit = function(r)
			{
				TiDev.messageArea.showDefaultMessage();
				
				if (r!=0)
				{
					alert('Install Error\n\n' + buffer);
				}
			};
			
		});

		// keystore location
		$('#android_key_store_location').click(function()
		{
			var props = {multiple:false,directories:false,files:true};
			Titanium.UI.currentWindow.openFileChooserDialog(function(f)
			{
				if (f.length)
				{
					// set file and revalidate
					$('#android_key_store').val(f[0]);
					androidPackageValidator();
				}
			},
			props);						
		});

		// distribution location
		$('#android_location_folder').click(function()
		{
			var props = {multiple:false,directories:true,files:false};
			Titanium.UI.currentWindow.openFolderChooserDialog(function(f)
			{
				if (f.length)
				{
					// set file and revalidate
					$('#android_location').val(f[0]);
					androidPackageValidator();
				}
			},
			props);						
		});
		
		TiUI.GreyButton({id:'android_package_button'});
		$('#android_package_button').click(function()
		{
			if ($(this).hasClass('disabled')) return true;
			TiDev.setConsoleMessage('Creating Android distribution...');
			var location = $('#android_location').val();
			var keystore = $('#android_key_store').val();
			var password = $('#android_key_store_password').val();
			var alias = $('#android_alias').val();
			var args = ["distribute", '"'+ PackageProject.currentProject.name+ '"','"' +TiDev.androidSDKDir+ '"', '"' + PackageProject.currentProject.dir + '"', '"'+PackageProject.currentProject.appid+'"','"'+keystore+'"','"'+password+'"','"'+alias+'"', '"'+location+'"'];
		 	var  x = TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.AndroidEmulatorPath).toString(),args);
			var buffer = '';
			x.onread = function(e)
			{
				buffer += e;
			};
			x.onexit = function(e)
			{
				TiDev.messageArea.showDefaultMessage();
				if (e != 0)
				{
					alert('Distribution Error\n\n' + buffer);
				}
			};
				
			TiDev.track('android-distribute',{name:PackageProject.currentProject.name,appid:PackageProject.currentProject.appid});
			
		});

		// packaging validation
		var androidPackageValidator = TiUI.validator('android_package',function(valid)
		{
			if (valid) 
				$('#android_package_button').removeClass('disabled');
			else
				$('#android_package_button').addClass('disabled');
		});
		
		// handle android emulator start
		$('#mobile_emulator_android').click(function()
		{
			// set height
			$('#mobile_android_emulator_viewer').css('height','347px');
			$('#mobile_package_detail').css('height','427px');

			// set margin
			$('#mobile_package_detail').css('marginLeft','-280px');

			// set width
			$('#mobile_package_detail').css('width','auto');

			// clear viewer
			$('#mobile_android_emulator_viewer').empty();

			$('#packaging .option').removeClass('active');
			$(this).addClass('active');

			$('#mobile_iphone_emulator_container').css('display','none');
			$('#mobile_android_emulator_container').css('display','block');	
			$('#mobile_device_detail').css('display','none');	
			$('#mobile_distribution_detail').css('display','none');	
			$('#mobile_help_detail').css('display','none');
			
		});

		// setup emulator buttons
		TiUI.GreyButton({id:'android_kill_button'});
		TiUI.GreyButton({id:'android_launch_button'});

		// setup emulator handlers and show tab
		$('#mobile_emulator_android').css('display','block');

		// TiUI.GreyButton({id:'android_clear_button'});
		// $('#android_clear_button').click(function()
		// {
		// 	$('#mobile_android_emulator_viewer').empty();
		// });	

		$('#android_kill_button').click(function()
		{
			if ($(this).hasClass('disabled'))return;
			
			if (PackageProject.currentAndroidEmulatorPID != null)
			{
				if (PackageProject.currentAndroidPID != null)
				{
					PackageProject.currentAndroidPID.terminate();
					PackageProject.currentAndroidPID = null;
				}
				
				PackageProject.currentAndroidEmulatorPID.terminate();
				PackageProject.currentAndroidEmulatorPID = null;
				
				// reset state
				PackageProject.isAndroidEmulatorRunning  = false;

				$(this).addClass('disabled')

			}
		});
		
		$('#android_launch_button').click(function()
		{
			if ($(this).hasClass('disabled'))return;
			
			TiDev.track('android-simulator',{name:PackageProject.currentProject.name,appid:PackageProject.currentProject.appid});
			
			$('#android_kill_button').removeClass('disabled');
			
			$('#mobile_android_emulator_viewer').empty();
			
			// install an android app
			function installAndroidApp()
			{
				var args = ["simulator", '"'+ PackageProject.currentProject.name+ '"','"' +TiDev.androidSDKDir+ '"', '"' + PackageProject.currentProject.dir + '"', '"'+PackageProject.currentProject.appid+'"'];
			 	PackageProject.currentAndroidPID= TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.AndroidEmulatorPath).toString(),args);

				var simBuf = '';
				PackageProject.currentAndroidPID.onread = function(d)
				{
					simBuf += d;
					var idx = simBuf.indexOf('\n');
					while (idx!=-1)
					{
						var str = simBuf.substring(0,idx);
						$('#mobile_android_emulator_viewer').append('<div style="margin-bottom:3px;">'+ str + '</div>');
						$('#mobile_android_emulator_viewer').get(0).scrollTop = $('#mobile_android_emulator_viewer').get(0).scrollHeight;
						if (idx+1 < simBuf.length)
						{
							simBuf = simBuf.substring(idx+1);
							idx = simBuf.indexOf('\n');
						}
						else
						{
							simBuf = '';
							break;
						}
					}
				};
				PackageProject.currentAndroidPID.onexit = function(d)
				{
					PackageProject.currentAndroidPID = null;
				};
				
			};
		
			PackageProject.initializeConsoleWidth();
			
			// first see if emulator is running
			if (PackageProject.isAndroidEmulatorRunning == false)
			{
				var emulatorBuf = '';
				
				PackageProject.isAndroidEmulatorRunning = true;
				var args = ["emulator", '"'+ PackageProject.currentProject.name+ '"','"' +TiDev.androidSDKDir+ '"', '"' + PackageProject.currentProject.dir + '"', '"'+PackageProject.currentProject.appid+'"'];
				PackageProject.currentAndroidEmulatorPID = TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.AndroidEmulatorPath).toString(),args);
				
				PackageProject.currentAndroidEmulatorPID.onread = function(d)
				{
					emulatorBuf += d;
					var idx = emulatorBuf.indexOf('\n');
					while (idx!=-1)
					{
						var str = emulatorBuf.substring(0,idx);
						if (str.indexOf('starting applications loader')!= -1)
						{
							installAndroidApp();
						}
						$('#mobile_android_emulator_viewer').append('<div style="margin-bottom:3px">'+ str + '</div>');
						$('#mobile_android_emulator_viewer').get(0).scrollTop = $('#mobile_android_emulator_viewer').get(0).scrollHeight;
						if (idx+1 < emulatorBuf.length)
						{
							emulatorBuf = emulatorBuf.substring(idx+1);
							idx = emulatorBuf.indexOf('\n');
						}
						else
						{
							emulatorBuf = '';
							break;
						}
					}

				};
				PackageProject.currentAndroidEmulatorPID.onexit = function()
				{
					PackageProject.currentAndroidEmulatorPID = null;
					PackageProject.isAndroidEmulatorRunning = false;
					$('#android_kill_button').addClass('disabled');
					
				};
			}
			else
			{
				installAndroidApp();
			}
			
		});
		
	}
	else
	{
		// otherwise show non-android view
		$('#mobile_emulator_android').css('display','none');
		$('.project_has_android_true').css('display','none');
		$('.project_has_android_false').css('display','block');
		
	}

	
	
	// handle install on device click
	$('#mobile_device').click(function()
	{
		// show right view
		$('#mobile_iphone_emulator_container').css('display','none');
		$('#mobile_android_emulator_container').css('display','none');
		$('#mobile_distribution_detail').css('display','none');	
		$('#mobile_help_detail').css('display','none');
		$('#mobile_device_detail').css('display','block');	

		$('#mobile_package_detail').css('height','427px');
		$('#mobile_package_detail').css('marginLeft','-280px');
		$('#mobile_package_detail').css('width','auto');
		
		// set classes
		$('#packaging .option').removeClass('active');
		$(this).addClass('active');
		
	});
	
	// mobile help tab
	$('#mobile_help').click(function()
	{
		// show right view
		$('#mobile_iphone_emulator_container').css('display','none');
		$('#mobile_android_emulator_container').css('display','none');
		$('#mobile_device_detail').css('display','none');	
		$('#mobile_distribution_detail').css('display','none');	
		$('#mobile_help_detail').css('display','block');
		
		$('#mobile_package_detail').css('height','428px');
		$('#mobile_package_detail').css('marginLeft','-21px');
		$('#mobile_package_detail').css('width','auto');
		
		// set classes
		$('#packaging .option').removeClass('active');
		$(this).addClass('active');
		
	});
	
	// handle install on device click
	$('#mobile_package').click(function()
	{
		// show right view
		$('#mobile_iphone_emulator_container').css('display','none');
		$('#mobile_android_emulator_container').css('display','none');
		$('#mobile_device_detail').css('display','none');	
		$('#mobile_distribution_detail').css('display','block');	
		$('#mobile_help_detail').css('display','none');
		
		$('#mobile_package_detail').css('height','450px');
		$('#mobile_package_detail').css('marginLeft','-280px');
		$('#mobile_package_detail').css('width','auto');
		
		// set classes
		$('#packaging .option').removeClass('active');
		$(this).addClass('active');
		
	});
	
};

//
// check iphone dev prereqs - enable/disable button based on this
//
PackageProject.checkIPhoneDevPrereqs = function()
{
	if ($('#iphone_device_sdk').val() == '3.0')
	{
		if (PackageProject.iPhoneDevPrereqs['itunes'] == true &&
			PackageProject.iPhoneDevPrereqs['wwdr'] == true &&
			PackageProject.iPhoneDevPrereqs['iphone_dev'] == true &&
			PackageProject.iPhoneDevPrereqs['iphone_dev_profile'] == true)
		{
			$('#iphone_install_on_device_button').removeClass('disabled');
		}
		else
		{
			$('#iphone_install_on_device_button').addClass('disabled');
		}
	}
	else
	{
		if (PackageProject.iPhoneDevPrereqs['wwdr'] == true &&
			PackageProject.iPhoneDevPrereqs['iphone_dev'] == true &&
			PackageProject.iPhoneDevPrereqs['iphone_dev_profile'] == true)
		{
			$('#iphone_install_on_device_button').removeClass('disabled');
		}
		else
		{
			$('#iphone_install_on_device_button').addClass('disabled');
		}
	}
	PackageProject.iPhoneDistValidator();
};

//
// check iphone dist prereqs - enable/disable button based on this
//
PackageProject.checkIPhoneDistPrereqs = function()
{
	if (PackageProject.iPhoneDevPrereqs['itunes'] == true &&
		PackageProject.iPhoneDevPrereqs['wwdr'] == true &&
		PackageProject.iPhoneDevPrereqs['iphone_dist'] == true &&
		PackageProject.iPhoneDevPrereqs['iphone_dist_profile'] == true)
	{
		$('#iphone_package_button').removeClass('disabled');
	}
	else
	{
		$('#iphone_package_button').addClass('disabled');
	}
	PackageProject.iPhoneDistValidator();
};

//
// update provisioning profile select
//
PackageProject.updateProvisioningSelect = function(id,data,selected)
{
	var html = ''
	for (var i=0;i<data.length;i++)
	{
		if (selected == null && i ==0)
		{
			html += '<option value="" selected>Select provisioning profile</option>';		
		}
		if (data[i].appid == selected)
		{
			html += '<option value="'+data[i].appid+'" selected>'+data[i].appid+ ' ('+data[i].name+')</option>';		
		}
		else
		{
			html += '<option value="'+data[i].appid+'">'+data[i].appid+ ' ('+data[i].name+')</option>';		
		}
	}
	$('#'+id).html(html);
};

//
// Add iphone attribute
//
PackageProject.setIPhoneAttribute = function(key,value)
{
	var curVal = PackageProject.getIPhoneAttribute(key);
	if (curVal == null)
	{
		// insert 
		TiDev.db.execute('INSERT INTO IPHONE_ATTRIBUTES (ID, NAME, VALUE) VALUES (?,?,?)', 
			PackageProject.currentProject.id, key,value);
	}
	else
	{
		// update project
		TiDev.db.execute('UPDATE IPHONE_ATTRIBUTES SET VALUE = ? WHERE ID = ? AND NAME = ?',value, 
			PackageProject.currentProject.id, key);
	}
};

//
// get an iphone attribute by key
//
PackageProject.getIPhoneAttribute = function(key)
{
	var rows = TiDev.db.execute('SELECT * FROM IPHONE_ATTRIBUTES WHERE id = ? and NAME = ?',PackageProject.currentProject.id,key);
	while (rows.isValidRow())
	{
		return rows.fieldByName('VALUE');
	}
	return null;
};

//
// Update APP ID
//
PackageProject.updateMobileAppId = function(appid)
{
	if (appid.indexOf('*') != -1)
	{
		var regex = new RegExp('^' +  appid.substring(0,appid.length-1)) 
		if (regex.test(PackageProject.currentProject.appid)==false)
		{
			appid = appid.substring(0,appid.length-1) + PackageProject.currentProject.name;
			TiDev.db.execute('UPDATE PROJECTS set appid = ? WHERE id = ?', appid, PackageProject.currentProject.id);
			PackageProject.currentProject.appid = appid;
		}
	}
	// if no * update to full appid
	else
	{
		TiDev.db.execute('UPDATE PROJECTS set appid = ? WHERE id = ?', appid, PackageProject.currentProject.id);
		PackageProject.currentProject.appid = appid;
	}
};

//
// Show file dialog for upload new provisioning profile
//
PackageProject.uploadIPhoneProvisioningProfile = function(profileType,callback)
{
	var props = {multiple:false,types:['mobileprovision']};
	Titanium.UI.openFileChooserDialog(function(f)
	{
		if (f.length)
		{
			TiDev.setConsoleMessage('Loading new provisioning profile...');
			

		 	var x= TiDev.launchPython(Titanium.Filesystem.getFile(PackageProject.iPhoneProvisioningPath).toString(),['"'+f[0]+'"']);
			x.onread = function(d)
			{
				var json = swiss.evalJSON(d);
				var appid = json['appid'];
				var type = (profileType =='distribution_profile')?'distribution':'development';
				var name = json['name'];
				var uuid = json['uuid']
				if (name && type && appid)
				{
					// add record to profile db
					PackageProject.addIPhoneProvisioningProfile(appid,f[0],type,name,uuid);
					
					// update appid
					PackageProject.updateMobileAppId(appid);
					
					var uuidString = (profileType =='distribution_profile')?'dist_uuid':'dev_uuid';

					// update current active
					PackageProject.setIPhoneAttribute(profileType,appid);
					PackageProject.setIPhoneAttribute(uuidString,uuid);

					callback({result:true,appid:appid});
					
				}
				else
				{
					callback({result:false});
				}
			};
		}
	},
	props);
};

//
// Add a iphone provisioning profile by type (developer | distribution)
//
PackageProject.addIPhoneProvisioningProfile = function(appid,dir,type,name,uuid)
{
	TiDev.db.execute('INSERT INTO IPHONE_PROVISIONING_PROFILES (appid, directory, type,name,uuid) VALUES(?,?,?,?,?)',appid,dir,type,name,uuid);
};

//
// Get a list of iphone provisioning profiles by type (developer | distribution)
//
PackageProject.getIPhoneProvisioningProfiles = function(type)
{
	var profiles = [];
	try
	{
		var dbrows = TiDev.db.execute('SELECT * FROM IPHONE_PROVISIONING_PROFILES WHERE type = ?', type);
		while (dbrows.isValidRow())
		{
			profiles.push({appid:dbrows.fieldByName('APPID'), name:dbrows.fieldByName('NAME')});
			dbrows.next();
		}
		return profiles;
	}
	catch(e)
	{
		TiDev.db.execute('CREATE TABLE IPHONE_PROVISIONING_PROFILES (APPID TEXT, DIRECTORY TEXT, TYPE TEXT, NAME TEXT, UUID TEXT)');
		return profiles;
	}
};

//
// Setup display for desktop project
//
PackageProject.setupDesktopView = function()
{
	// show correct view
	$('#mobile_packaging').css('display','none');
	$('#desktop_packaging').css('display','block');
	
	// setup option handlers
	$('.optiongroup').click(function()
	{
		var id = $(this).get(0).id;
		switch (id)
		{
			case 'linux_packaging':
			case 'win_packaging':
			case 'mac_packaging':
			{
				if ($(this).hasClass('active_option'))
				{
					$(this).removeClass('active_option');
				}
				else
				{
					$(this).addClass('active_option');
				}
				break;
			}
			case 'public_packaging':
			{
				$(this).addClass('active_option');
				$('#private_packaging').removeClass('active_option');
				break;
			}
			case 'private_packaging':
			{
				$(this).addClass('active_option');
				$('#public_packaging').removeClass('active_option');
				break;
			}
			case 'network_packaging':
			{
				$(this).addClass('active_option');
				$('#bundled_packaging').removeClass('active_option');
				break;
			}
			case 'bundled_packaging':
			{
				$(this).addClass('active_option');
				$('#network_packaging').removeClass('active_option');
				break;
			}
			case 'release_yes_packaging':
			{
				$(this).addClass('active_option');
				$('#release_no_packaging').removeClass('active_option');
				break;
			}
			case 'release_no_packaging':
			{
				$(this).addClass('active_option');
				$('#release_yes_packaging').removeClass('active_option');
				break;
			}

		}
	});
	
	// setup buttons
	TiUI.GreyButton({id:'launch_kill_button'});
	TiUI.GreyButton({id:'launch_kill_button'});
	TiUI.GreyButton({id:'launch_app_button'});

	TiUI.GreyButton({id:'desktop_package_button'});

	// setup button listeners
	// TiUI.GreyButton({id:'launch_clear_button'});
	// $('#launch_clear_button').click(function()
	// {
	// 	$('#desktop_launch_viewer').empty();
	// });

	$('#launch_kill_button').click(function()
	{
		if ($(this).hasClass('disabled'))return;

		if (PackageProject.currentAppPID != null)
		{
			PackageProject.currentAppPID.terminate();
			PackageProject.currentAppPID = null;
			$('#launch_kill_button').addClass('disabled');
			$('#launch_app_button').removeClass('disabled');
		}
	});
	$('#desktop_package_button').click(function()
	{		
		if ($(this).hasClass('disabled')) return;
	
		var osSelected =false
		$('.operating_system').each(function()
		{
			if ($(this).hasClass('active_option'))
			{
				osSelected=true;
			}
		});

		if (osSelected==false)
		{
			alert('You must select at least one operating system.');
			return;
		}
		
		
		$(this).addClass('disabled');
		
		// set margin
		$('#desktop_package_detail').css('marginLeft','-21px');

		// write out manifest
		Titanium.Project.writeManifest(PackageProject.currentProject);
		
		// write out timanifest 
		PackageProject.writeTiManifest(PackageProject.currentProject);
		
		// copy files to be published
		PackageProject.copyAppFiles(PackageProject.currentProject, function(r)
		{
			// publish app
			if (r.dir != null)
			{
				PackageProject.publishDesktopApp(r.dir, PackageProject.currentProject);
			}
			else
			{
				TiDev.setConsoleMessage('Unexpected error, message: ' + r.error, 5000);
			}
		});
	});
	
	// setup desktop launch handler
	$('#desktop_launch').click(function()
	{
		// set height
		$('#desktop_launch_viewer').css('height','347px');
		$('#desktop_package_detail').css('height','427px');

		// set margin
		$('#desktop_package_detail').css('marginLeft','-280px');

		// set width
		$('#desktop_package_detail').css('width','auto');

		// set classes
		$(this).addClass('active');
		$('#desktop_package').removeClass('active');
		$('#desktop_help').removeClass('active');

		// set display
		$('#desktop_packaging_overview').css('display','none');
		$('#desktop_packaging_options').css('display','none');
		$('#desktop_launch_detail').css('display','block');

	});
	
	//
	// launch desktop app
	//
	$('#launch_app_button').click(function()
	{
		if ($(this).hasClass('disabled'))return;
		
		$('#launch_app_button').addClass('disabled');
		$('#launch_kill_button').removeClass('disabled');
		
		if (PackageProject.currentAppPID == null)
		{
			// clear viewer
			$('#desktop_launch_viewer').empty();

			PackageProject.initializeConsoleWidth();
			
			// set desktop packaging path
			var runtime = PackageProject.currentProject.runtime;
			var sdk = Titanium.Project.getSDKVersions(runtime);
			PackageProject.desktopPackage = Titanium.Filesystem.getFile(sdk.getPath(),'tibuild.py');
			var dest = Titanium.Filesystem.getFile(PackageProject.currentProject.dir,'dist',Titanium.platform);
			if (dest.exists()==false)
			{
				dest.createDirectory(true);
			}
			var sdkDir = Titanium.Filesystem.getFile(sdk.getPath());
			var basePath = Titanium.Filesystem.getFile(sdkDir,".." + Titanium.Filesystem.getSeparator(),".." + Titanium.Filesystem.getSeparator(),".." + Titanium.Filesystem.getSeparator());
			var assets = Titanium.Filesystem.getFile(sdk.getPath());
			var appdir = Titanium.Filesystem.getFile(PackageProject.currentProject.dir);

			// write out new manifest based on current modules
			Titanium.Project.writeManifest(PackageProject.currentProject);

			TiDev.track('desktop-launch',{sdk:runtime,appid:PackageProject.currentProject.appid,name:PackageProject.currentProject.name,guid:PackageProject.currentProject.guid});
			
			// launch desktop app
			PackageProject.currentAppPID = TiDev.launchPython(PackageProject.desktopPackage.toString(), ["-d",dest.toString(),"-t", "bundle","-a",assets.toString(),appdir.toString(),"-n","-r","-v","-s",basePath.toString()]);
			
		 	$('#desktop_launch_viewer').append('<div style="margin-bottom:3px">Preparing to package and launch desktop app. One momenet...</div>');
			
			var buf = ''
			PackageProject.currentAppPID.onread = function(d)
			{
				buf += d;
				var idx = buf.indexOf('\n');
				while (idx!=-1)
				{
					var str = buf.substring(0,idx);
					$('#desktop_launch_viewer').append('<div style="margin-bottom:3px">'+ str + '</div>');
					$('#desktop_launch_viewer').get(0).scrollTop = $('#desktop_launch_viewer').get(0).scrollHeight;
					if (idx+1 < buf.length)
					{
						buf = buf.substring(idx+1);
						idx = buf.indexOf('\n');
					}
					else
					{
						buf = '';
						break;
					}
				}
			}
			PackageProject.currentAppPID.onexit = function()
			{
				PackageProject.currentAppPID = null;
				$('#launch_kill_button').addClass('disabled');
				$('#launch_app_button').removeClass('disabled');
				
			};
		}
		
	});
	
	// setup desktop help handler
	$('#desktop_help').click(function()
	{
		// set display
		$('#desktop_packaging_overview').css('display','block');
		$('#desktop_packaging_options').css('display','none');
		$('#desktop_launch_detail').css('display','none');

		// set width
		$('#desktop_package_detail').css('width','360px');

		// set margin
		$('#desktop_package_detail').css('marginLeft','-21px');

		// set height
		$('#desktop_package_detail').css('height','410px');

		// set classes
		$(this).addClass('active');
		$('#desktop_package').removeClass('active');
		$('#desktop_launch').removeClass('active');

	});

	// setup desktop package handler
	$('#desktop_package').click(function()
	{
		// set display
		$('#desktop_packaging_overview').css('display','none');
		$('#desktop_packaging_options').css('display','block');
		$('#desktop_launch_detail').css('display','none');

		// set width
		$('#desktop_package_detail').css('width','300px');

		// set margin
		$('#desktop_package_detail').css('marginLeft','-21px');
		
		// set height
		$('#desktop_package_detail').css('height','340px');

		// set classes
		$(this).addClass('active');
		$('#desktop_help').removeClass('active');
		$('#desktop_launch').removeClass('active');

	});
	
	
};

//
// set initial console width
//
PackageProject.initializeConsoleWidth = function()
{
	var windowWidth = Titanium.UI.currentWindow.getWidth();
	var leftWidth = $('#tiui_content_left').width();
	var rightWidth = windowWidth - leftWidth;	
	$('.debug_console').css('width',(rightWidth-250) + 'px');
};

// setup event handler
PackageProject.eventHandler = function(event)
{
	var listener = null;
	if (event == 'focus')
	{
		PackageProject.setupView();
	}
	else if (event == 'load')
	{
		PackageProject.setupView();
	}
	else if (event == 'blur')
	{
	}
};

//
// Write timanifest file
//
PackageProject.writeTiManifest = function(project)
{
	// make sure required files/dirs are present
	var resources = TFS.getFile(project.dir,'Resources');
	if (!resources.exists())
	{
		alert('Your project is missing the Resources directory.  This directory is required for packaging.');
		return;
	}
	var tiapp = TFS.getFile(project.dir,'tiapp.xml');
	if (!tiapp.exists())
	{
		alert('Your tiapp.xml file is missing.  This file is required for packaging.');
		return;
	}

	// get packaging options
	var networkRuntime = ($('#network_packaging').hasClass('active_option') ==true)?'network':'include';
	var releaseUpdates = ($('#release_yes_packaging').hasClass('active_option') ==true)?true:false;
	var visibility = ($('#public_packaging').hasClass('active_option')==true)?'public':'private';

	var timanifest = {};

	timanifest.appname = project.name;
	timanifest.appid = project.appid;
	timanifest.appversion = project.version;
	timanifest.mid = Titanium.Platform.id;
	timanifest.publisher = project.publisher;
	timanifest.url = project.url;
	timanifest.desc = project.description;
	timanifest.release = releaseUpdates;
	
	if (project.image)
	{
		// look for image in two places - either full path or in resources dir
		var image = TFS.getFile(project.image);
		if (!image.exists())
		{
			image = TFS.getFile(resources,project.image);
		}
		// use default if not exists
		if (!image.exists())
		{
			var path = Titanium.App.appURLToPath('app://images');
			image = TFS.getFile(path,'default_app_logo.png')
		}
		
		var image_dest = TFS.getFile(resources,image.name());
		if (image.toString() != image_dest.toString())
		{
			image.copy(image_dest);
		}
		imageName = image.name();
		timanifest.image = image.name();
	}

	// OS options
	timanifest.platforms = [];
	var winTrue = false; linuxTrue = false; macTrue = false;
	if ($('#mac_packaging').hasClass('active_option'))
	{
		timanifest.platforms.push('osx');
		macTrue =true;
	}
	if ($('#win_packaging').hasClass('active_option'))
	{
		timanifest.platforms.push('win32');
		winTrue = true;
	}
	if ($('#linux_packaging').hasClass('active_option'))
	{
		timanifest.platforms.push('linux');
		linuxTrue = true;
	}
	TiDev.track('desktop-package',{win:winTrue,linux:linuxTrue,mac:macTrue});

	timanifest.visibility = visibility;

	timanifest.runtime = {};
	timanifest.runtime.version = "" + Titanium.Project.runtimeVersion;
	timanifest.runtime.package = networkRuntime;

	timanifest.guid = project.guid;
	
	if (project.type == 'desktop')
	{
		timanifest.modules = [];

		// required modules
		for (var i=0;i<Titanium.Project.requiredModules.length;i++)
		{
			var m = {};
			m.name = Titanium.Project.requiredModules[i].name;			
			m.version = "" + Titanium.Project.requiredModules[i].version;
			m.package = networkRuntime;
			timanifest.modules.push(m);
		}

		// write out optional modules
		for (var c=0;c<Titanium.Project.optionalModules.length;c++)
		{
			if (timanifest.appid != 'com.appcelerator.titanium.developer' && Titanium.Project.optionalModules[c].name.indexOf('sdk')!=-1)
				continue;

			var add = true;
			
			if (Titanium.Project.optionalModules[c].name == 'ruby')
			{
				if (project['languageModules'].ruby != 'on')
				{
					add = false;
				}
			}
			if (Titanium.Project.optionalModules[c].name == 'python')
			{
				if (project['languageModules'].python != 'on')
				{
					add = false;
				}
			}

			if (add ==true)
			{
				var m = {};
				m.name = Titanium.Project.optionalModules[c].name;			
				m.version = "" + Titanium.Project.optionalModules[c].version;
				m.package = networkRuntime;
				timanifest.modules.push(m);
			}
		}
	}
	else
	{
		timanifest['package_target'] = 'test';
	}

	var timanifestFile = TFS.getFile(project.dir,'timanifest');
	timanifestFile.write(swiss.toJSON(timanifest));
	
};

//
// Copy app files for packaging
//
PackageProject.copyAppFiles = function(project, callback)
{
	try
	{
		var resources = TFS.getFile(project.dir,'Resources');		
		var destDir = Titanium.Filesystem.createTempDirectory();
		var modules = TFS.getFile(project.dir,'modules');
		var timanifest = TFS.getFile(project.dir,'timanifest');
		var manifest = TFS.getFile(project.dir,'manifest');
		var tiapp = TFS.getFile(project.dir,'tiapp.xml');
		var changeLog = TFS.getFile(project.dir,'CHANGELOG.txt');
		var license = TFS.getFile(project.dir,'LICENSE.txt');

		var fileArray = [tiapp,timanifest,manifest];
		
		if (changeLog.exists())
		{
			fileArray.push(changeLog);
		}
		if (license.exists())
		{
			fileArray.push(license);
		}

		// copy files to temp dir
		var resDir = TFS.getFile(destDir,'Resources');
		resDir.createDirectory();

		TFS.asyncCopy(resources, resDir,function(path,currentIndex,total)
		{
			if (currentIndex==total)
			{
				TFS.asyncCopy(fileArray, destDir,function(path,currentIndex,total)
				{
					if (currentIndex==total)
					{
						// if project has modules, copy
						if (modules.exists())
						{
							// create resources dir
							var resDir = TFS.getFile(destDir,'modules');
							resDir.createDirectory();
							TFS.asyncCopy(modules, resDir,function(path,currentIndex,total)
							{
								if (currentIndex==total)
								{
									callback({dir:destDir});
								}
							});
						}
						else
						{
							callback({dir:destDir});
						}
					}
				});
			}
		});
	}
	catch (e)
	{
		callback({dir:null,error:e});
	}	
	
};

//
// Publish a desktop app
//
PackageProject.publishDesktopApp = function(destDir,project)
{
	// set packaging message
	TiDev.messageArea.setMessage(TiUI.progressBar.html('Packaging your app.  This may take a few...'));
	TiUI.progressBar.init();
	TiDev.messageArea.expand();				
	
	var url = Titanium.App.getStreamURL(PackageProject.publishURL);
	var data = {};
	data.sid = Projects.userSID;
	data.token = Projects.userToken;
	data.uid = Projects.userUID;
	data.uidt = Projects.userUIDT;

	url = TiDev.makeURL(url,data);
	var xhr = Titanium.Network.createHTTPClient();
	var ticket = null;
	xhr.onreadystatechange = function()
	{
		// 4 means that the POST has completed
		if (this.readyState == 4)
		{
			destDir.deleteDirectory(true);
			if (this.status == 200)
			{
				var json = swiss.evalJSON(this.responseText);
				if (json.success == false)
				{
					TiDev.setConsoleMessage('Packaging failed. Error: ' + json.message, 5000);
					$('#desktop_package_button').removeClass('disabled');
					
				}
				else
				{
					PackageProject.pollPackagingRequest(json.ticket,project.guid)
				}
			}
			else
			{
				
				TiDev.setConsoleMessage('Packaging failed. HTTP status: ' + this.status, 5000);
				$('#desktop_package_button').removeClass('disabled');
			}
		}
	};
	xhr.open("POST",url);
	xhr.sendDir(destDir);  
};

PackageProject.pollPackagingRequest = function(ticket,guid)
{
	TiDev.invokeCloudService(PackageProject.publishStatusURL,{ticket:ticket},'GET',function(r)
	{
	   	if (r.status == 'complete')
	   	{
			var date = r.pubdate;
			var releases = r.releases;
			var appPage = r.app_page;
			TiDev.setConsoleMessage('Packaging was successful!', 2000);	
			
			//show links subtab
			TiDev.subtabChange(2);
			
			// enable packaging button
			$('#desktop_package_button').removeClass('disabled');
			
					
		}
		else if (r.success == false)
		{
			TiDev.setConsoleMessage('Packaging failed with message: ' + r.message, 5000);
			$('#desktop_package_button').removeClass('disabled');
			return;			
		}
		else
		{
			// poll every 10 seconds
			setTimeout(function()
			{
				PackageProject.pollPackagingRequest(ticket,guid);
			},10000);
		}
	});
};

//
//  Add listener to resize
//
Titanium.UI.currentWindow.addEventListener(function(event)
{
	if(event == 'resized')
	{
		PackageProject.initializeConsoleWidth();
	}
});

// register module
TiDev.registerModule({
	name:'packaging',
	displayName: 'Test & Package',
	perspectives:['projects'],
	html:'packaging.html',
	idx:1,
	callback:PackageProject.eventHandler
});
