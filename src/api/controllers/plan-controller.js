const db = require("../config/db");


const getPlanData = async (req, res) => {
    //res.send({ status: req.user.org_type});
    if (req.user.org_type == "ISGS") {
        if (req.query.action_date == undefined || req.query.action_date == null || req.query.action_date == "")
            req.query.action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
        var result = await db.query("select * from distribution_plans WHERE plan_date='" + req.query.action_date + "'");
       
          if (result.length == 0) {
				res.send({ status: '404', data: [], result: 'ISGS_no_plan', message: "isgs yet to upload capcity sheet." });
				return;
			}else{
		      var plan_stage = result[0].plan_stage;		
			 if(result[0].plan_stage == 1){	
				var plan_id = result[0].id;
                    result = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id = " + req.user.user_id + " group by id, txn_status order by version desc");

					if (result.length == 0) {
						res.send({ status: '404', data: [], result: 'ISGS_no_plan', message: "isgs yet to upload capcity sheet." });
						return;
					}
					var latestVersion = result[0].version;
					var blocks = await db.query("SELECT dc.* FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id WHERE plan_id=" + plan_id + " and version = " + latestVersion);
					res.setHeader("Content-Type", "application/json");
					res.send({ status: result[0].txn_status, plan_stage: plan_stage, plan_id:plan_id, data: blocks, transaction_id: result[0].id });
					return;
			  }
			  ////////////////////////////// plan_stage 2 ///////////////////////////////////
			  if(result[0].plan_stage == 2){	
				var plan_id = result[0].id;
                    result = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id = " + req.user.user_id + " group by id, txn_status order by version desc");

					if (result.length == 0) {
						res.send({ status: '404', data: [], result: 'ISGS_plan_stage2', message: "isgs yet to upload capcity sheet." });
						return;
					}
					var latestVersion = result[0].version;
					//var blocks = await db.query("SELECT dc.* FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id WHERE plan_id=" + plan_id + " and version = " + latestVersion);
					
					var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + latestVersion +" and user_id = "+ req.user.user_id);
					
					txt_max = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and txn_source = 2 group by id, txn_status order by version desc");
                        
						var response_ent = '';
					 if(txt_max !=''){	
					 var response_ent = {};
				        let sldcOrgs = await getAllOrgByType('SLDC');
						//res.send({sldcOrgs});
						for(let ii = 0; ii < sldcOrgs.length; ii++) {
							let result = await getEntitlementsFor(sldcOrgs[ii].user_id, req.user.user_id, txt_max[0].id);
							if(result.length > 0)
								response_ent[sldcOrgs[ii].name] = result;
						}
					
					 }
					
					res.setHeader("Content-Type", "application/json");
					res.send({ status: result[0].txn_status, plan_stage: plan_stage, plan_id:plan_id, data: blocks, transaction_id: result[0].id, response_ent:response_ent });
					return;   
			  }
			  
			  ////////////////////////////// plan_stage 3 ///////////////////////////////////
			  if(result[0].plan_stage == 3){	
			        
				var plan_id = result[0].id;
                    result = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id = " + req.user.user_id + " group by id, txn_status order by version desc");

					if (result.length == 0) {
						res.send({ status: '404', data: [], result: 'ISGS_plan_stage3', message: "isgs yet to upload capcity sheet." });
						return;
					}
					var latestVersion = result[0].version;
					
					var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + latestVersion +" and user_id = "+ req.user.user_id);
					
					txt_max = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and txn_source = 2 group by id, txn_status order by version desc");
                        
						var response_ent = {};
				        let sldcOrgs = await getAllOrgByType('SLDC');
						//res.send({sldcOrgs});
						for(let ii = 0; ii < sldcOrgs.length; ii++) {
							let result = await getEntitlementsFor(sldcOrgs[ii].user_id, req.user.user_id, txt_max[0].id);
							if(result.length > 0)
								response_ent[sldcOrgs[ii].name] = result;
						}
								 
				 	res.setHeader("Content-Type", "application/json");
					res.send({ status: result[0].txn_status, user: req.user, plan_stage: plan_stage, plan_id:plan_id, response_ent: response_ent, data: blocks, transaction_id: result[0].id });
					return;   
			  }
			  
			  ////////////////////////////// plan_stage 4 ///////////////////////////////////
			  if(result[0].plan_stage == 4){	
			        
				var plan_id = result[0].id;
                    result = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id = " + req.user.user_id + " group by id, txn_status order by version desc");

					if (result.length == 0) {
						res.send({ status: '404', data: [], result: 'ISGS_plan_stage3', message: "isgs yet to upload capcity sheet." });
						return;
					}
					var latestVersion = result[0].version;
					
					var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + latestVersion +" and user_id = "+ req.user.user_id);
					
					txt_max = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and txn_source = 2 group by id, txn_status order by version desc");
                        
						var response_ent = {};
				        let sldcOrgs = await getAllOrgByType('SLDC');
						//res.send({sldcOrgs});
						for(let ii = 0; ii < sldcOrgs.length; ii++) {
							let result = await getEntitlementsFor(sldcOrgs[ii].user_id, req.user.user_id, txt_max[0].id);
							if(result.length > 0)
								response_ent[sldcOrgs[ii].name] = result;
						}
						
						
						///////////////// provisional ///////////////////////
						result_provisional_txn = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_type = 4 order by id desc");
						var result_provisional_txn_id = result_provisional_txn[0].id;
						
						var provisional = {};
						//let sldcOrgs = await getAllOrgByType('SLDC');
						//res.send({result_provisional_txn_id});
						for(let ii = 0; ii < sldcOrgs.length; ii++) {
							let result = await getProvisionalForIsgs(sldcOrgs[ii].user_id, req.user.user_id, result_provisional_txn_id);
							//res.send({result});
							if(result.length > 0)
								provisional[sldcOrgs[ii].name] = result;
						}
							 
				 	res.setHeader("Content-Type", "application/json");
					res.send({ status: result[0].txn_status, user: req.user, plan_stage: plan_stage, plan_id:plan_id, response_ent: response_ent, data: blocks, transaction_id: result[0].id, provisional:provisional });
					return;   
			  }
			  
			  
			}	
       
        
    }
    else if (req.user.org_type == "RLDC") {
		var transaction_id = '';
        if (req.query.action_date == undefined || req.query.action_date == null || req.query.action_date == "")
            req.query.action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
        var plan = await db.query("select * from distribution_plans WHERE plan_date='" + req.query.action_date + "'");
		 	
		if (plan.length == 0) {
			   var response = {
					plan: {
						plan_id: plan[0].id,
						plan_stage: plan[0].plan_stage,
						plan_date: plan[0].plan_date
					},
					txn_details: {},
					capacity: {}
				   };
				res.send({ status: '404', data: response, result: 'ISGS_no_plan', message: "isgs yet to upload capcity sheet." });
				return;
			}else{
			 if(plan[0].plan_stage == 1){	
			   var response = {
					plan: {
						plan_id: plan[0].id,
						plan_stage: plan[0].plan_stage,
						plan_date: plan[0].plan_date
					},
					txn_details: {},
					capacity: {}
				   }; 
				res.send({ status: '404', data: response, result: 'RLDC_no_plan', message: "isgs yet to upload capcity sheet." });
				return;
			  }
			  /////////////////////////  Plan Stage2 ////////////////////////////////////
			  if(plan[0].plan_stage == 2){
				 var response = {
					plan: {
						plan_id: plan[0].id,
						plan_stage: plan[0].plan_stage,
						plan_date: plan[0].plan_date
					},
					txn_details: {},
					capacity: {}
				   }; 
				   
				    var plan_id = plan[0].id;
					var transactions = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_source = 1 and txn_status = 2 ");

					if (transactions.length == 0) {
						res.status(404);
						res.send({data: response, message: 'No published capacity found for the date.' });
						return;
					}
					for (var index = 0; index < transactions.length; index++) {
						var transaction = await db.query("SELECT action_timestamp as txn_date, txn_type, txn_source, version \
						FROM user_txns WHERE plan_id=" + plan_id + " and txn_status = 2 and user_id = " + transactions[index].user_id + " and version = " + transactions[index].version);
						var userAccount = await db.query(" \
						SELECT up.id, full_name, ur.name as role, ot.name as org_type, o.name as org_name FROM user_profiles up \
						JOIN user_roles_pl ur ON up.role = ur.id \
						JOIN organizations o ON o.id = up.organization \
						JOIN org_types_pl ot ON ot.id = o.org_type \
						WHERE up.id =" + transactions[index].user_id);

						userAccount = userAccount[0];
						console.log(userAccount);
						var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + transactions[index].version);

						response.txn_details[userAccount['org_name']] = transaction[0];
						response.capacity[userAccount['org_name']] = blocks;
					}
					//res.send({ status: response});
					var response_ent_status = '';
					txt_max = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and user_id = " + req.user.user_id + " and txn_type = '2' order by version desc limit 0, 1");
                    
					
					let isgsOrgs = await getAllOrgByType('ISGS');
					var sldcOrgs = await getAllOrgByType('SLDC');
					
					//res.send(txt_max);
					Requisitions_Ent = {Entitlements:{}};
					if(txt_max !=''){
						transaction_id = txt_max[0].id;
						response_ent_status = 'Yes';
						for(var ii = 0; ii < isgsOrgs.length; ii++) {
							for(var si = 0; si < sldcOrgs.length; si++) {
								var txt_max_id = txt_max[0].id; 	  
								var requisitionData = await getEntitlementsRldc(isgsOrgs[ii].user_id , sldcOrgs[si].user_id, txt_max_id);
										
								if(Requisitions_Ent.Entitlements[isgsOrgs[ii].name] === undefined) Requisitions_Ent.Entitlements[isgsOrgs[ii].name] = {};
								Requisitions_Ent.Entitlements[isgsOrgs[ii].name][sldcOrgs[si].name] = requisitionData;
							}	
						}
					}	
										
                    res.send({ status: '404', data: response, result: 'RLDC_result', message: "isgs yet to uploaded capcity sheet.", response_ent:Requisitions_Ent, response_ent_status:response_ent_status, transaction_id : transaction_id});
					//res.send(response);
					return;
				  
			  }
			  /////////////////////////  Plan Stage3 ////////////////////////////////////
			  if(plan[0].plan_stage == 3){
				 var response = {
					plan: {
						plan_id: plan[0].id,
						plan_stage: plan[0].plan_stage,
						plan_date: plan[0].plan_date
					},
					txn_details: {},
					capacity: {},
					ent: {}
				   }; 
				   
				    var plan_id = plan[0].id;
					var transactions = await db.query("SELECT user_id, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and txn_status = 2 group by user_id");

					if (transactions.length == 0) {
						res.status(404);
						res.send({ message: 'No published capacity found for the date.' });
						return;
					}
					for (var index = 0; index < transactions.length; index++) {
						var transaction = await db.query("SELECT action_timestamp as txn_date, txn_type, txn_source, version \
						FROM user_txns WHERE plan_id=" + plan_id + " and txn_status = 2 and user_id = " + transactions[index].user_id + " and version = " + transactions[index].version);
						var userAccount = await db.query(" \
						SELECT up.id, full_name, ur.name as role, ot.name as org_type, o.name as org_name FROM user_profiles up \
						JOIN user_roles_pl ur ON up.role = ur.id \
						JOIN organizations o ON o.id = up.organization \
						JOIN org_types_pl ot ON ot.id = o.org_type \
						WHERE up.id =" + transactions[index].user_id);

						userAccount = userAccount[0];
						console.log(userAccount);
						var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + transactions[index].version);
												                        
						response.txn_details[userAccount['org_name']] = transaction[0];
						response.capacity[userAccount['org_name']] = blocks;
						//response.ent = entitlements;
					}
					var response_ent_status = '';
					txt_max = await db.query("SELECT id, txn_status, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and user_id = " + req.user.user_id + " group by id, txn_status order by version desc");
                 
					var response_ent = {};
					
					let isgsOrgs = await getAllOrgByType('ISGS');
					var sldcOrgs = await getAllOrgByType('SLDC');
					//res.send(sldcOrgs);
					Requisitions_Ent = {Entitlements:{}};
					if(txt_max !=''){
						response_ent_status = 'Yes';
						for(var ii = 0; ii < isgsOrgs.length; ii++) {
							for(var si = 0; si < sldcOrgs.length; si++) {
								var txt_max_id = txt_max[0].id; 	  
								var requisitionData = await getEntitlementsRldc(isgsOrgs[ii].user_id , sldcOrgs[si].user_id, txt_max_id);
										
								if(Requisitions_Ent.Entitlements[isgsOrgs[ii].name] === undefined) Requisitions_Ent.Entitlements[isgsOrgs[ii].name] = {};
								Requisitions_Ent.Entitlements[isgsOrgs[ii].name][sldcOrgs[si].name] = requisitionData;
							}	
						}
					}	
					   
					   Requisitions_status = '';
					   result_Res_txn = await db.query("SELECT id FROM user_txns WHERE plan_id=" + plan_id + " and txn_type = 3 and txn_status = 2 ");
																		
						
						var Requisitions_response = {requisitions:{}};
						if(result_Res_txn !=''){
						Requisitions_status = 'Yes';
											
								for(var ii = 0; ii < isgsOrgs.length; ii++) {
								      for(var si = 0; si < sldcOrgs.length; si++) {
									  var result_Res_txn_id = result_Res_txn[si].id; 	  
									  var requisitionData = await getRequisitionsForRldc(isgsOrgs[ii].user_id , sldcOrgs[si].user_id, result_Res_txn_id);
									
									if(Requisitions_response.requisitions[isgsOrgs[ii].name] === undefined) Requisitions_response.requisitions[isgsOrgs[ii].name] = {};
									Requisitions_response.requisitions[isgsOrgs[ii].name][sldcOrgs[si].name] = requisitionData;
								  }	

								}
							}	
						
					   //res.send({ status: Requisitions_response});
				
                    res.send({ status: '404', Requisitions: Requisitions_response, response_ent: Requisitions_Ent, response_ent_status:response_ent_status, data: response, result: 'RLDC_result', message: "isgs yet to uploaded capcity sheet.", Requisitions_status:Requisitions_status, transaction_id : transaction_id });
					//res.send(response);
					return;
				  
			  }
			  
			   /////////////////////////  Plan Stage4 ////////////////////////////////////
			if(plan[0].plan_stage == 4){
				 var response = {
					plan: {
						plan_id: plan[0].id,
						plan_stage: plan[0].plan_stage,
						plan_date: plan[0].plan_date
					},
					txn_details: {},
					capacity: {},
					ent: {}
				   }; 
				   //res.send({ message:  plan[0].id});
				    var plan_id = plan[0].id;
					var transactions = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_status = 2 and txn_type = 1");

					if (transactions.length == 0) {
						res.status(404);
						res.send({ message: 'No published capacity found for the date.' });
						return;
					}
					
					for (var index = 0; index < transactions.length; index++) {
						var transaction = await db.query("SELECT action_timestamp as txn_date, txn_type, txn_source, version \
						FROM user_txns WHERE plan_id=" + plan_id + " and txn_status = 2 and user_id = " + transactions[index].user_id + " and version = " + transactions[index].version);
						var userAccount = await db.query(" \
						SELECT up.id, full_name, ur.name as role, ot.name as org_type, o.name as org_name FROM user_profiles up \
						JOIN user_roles_pl ur ON up.role = ur.id \
						JOIN organizations o ON o.id = up.organization \
						JOIN org_types_pl ot ON ot.id = o.org_type \
						WHERE up.id =" + transactions[index].user_id);

						userAccount = userAccount[0];
						console.log(userAccount);
						var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + transactions[index].version);
												                        
						response.txn_details[userAccount['org_name']] = transaction[0];
						response.capacity[userAccount['org_name']] = blocks;
						//response.ent = entitlements;
					}
					
					var response_ent_status = '';
					txt_max = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and user_id = " + req.user.user_id + " and txn_type = 2 and txn_status = 2 order by version desc");
                 
					var response_ent = {};
					let isgsOrgs = await getAllOrgByType('ISGS');
					var sldcOrgs = await getAllOrgByType('SLDC');
					//res.send(sldcOrgs);
					
					Requisitions_Ent = {Entitlements:{}};
					if(txt_max !=''){
						response_ent_status = 'Yes';
						for(var ii = 0; ii < isgsOrgs.length; ii++) {
							for(var si = 0; si < sldcOrgs.length; si++) {
								var txt_max_id = txt_max[0].id; 	  
								var requisitionData = await getEntitlementsRldc(isgsOrgs[ii].user_id , sldcOrgs[si].user_id, txt_max_id);
										
								if(Requisitions_Ent.Entitlements[isgsOrgs[ii].name] === undefined) Requisitions_Ent.Entitlements[isgsOrgs[ii].name] = {};
								Requisitions_Ent.Entitlements[isgsOrgs[ii].name][sldcOrgs[si].name] = requisitionData;
							}	
						}
					}	
					
					   //res.send({ message: response_ent});
					   result_Res_txn = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_type = 3 and txn_status = 2 order by version desc");
						//res.send({ result_Res_txn });
						var result_Res_txn_id = result_Res_txn[0].id;
						
						var Requisitions_response = {requisitions:{}};
						if(result_Res_txn !=''){
						Requisitions_status = 'Yes';
							for(var ii = 0; ii < isgsOrgs.length; ii++) {
								      for(var si = 0; si < sldcOrgs.length; si++) {
									  var result_Res_txn_id = result_Res_txn[si].id; 	  
									  var requisitionData = await getRequisitionsForRldc(isgsOrgs[ii].user_id , sldcOrgs[si].user_id, result_Res_txn_id);
									
									if(Requisitions_response.requisitions[isgsOrgs[ii].name] === undefined) Requisitions_response.requisitions[isgsOrgs[ii].name] = {};
									Requisitions_response.requisitions[isgsOrgs[ii].name][sldcOrgs[si].name] = requisitionData;
								  }	

								}
						    }
						//res.send({ message: Requisitions});
						///////////////// provisional ///////////////////////
						var provisional = '';
						result_provisional_txn = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_type = 4 order by version desc");
						if(result_provisional_txn !=''){
						var result_provisional_txn_id = result_provisional_txn[0].id;
						
						provisional = await getActiveProvisional(result_provisional_txn_id);
						}	
					   
				
                    res.send({ status: '404', Requisitions: Requisitions_response, response_ent: Requisitions_Ent, response_ent_status:response_ent_status, data: response, provisional:provisional, result: 'RLDC_result', message: "isgs yet to uploaded capcity sheet.", transaction_id : transaction_id });
					//res.send(response);
					return;
				  
			  }  
			  
			  
			}
        }
    else if (req.user.org_type == "SLDC") {
		//res.send({ statusdd: req.user.org_type});
        if (req.query.action_date == undefined || req.query.action_date == null || req.query.action_date == "")
            req.query.action_date = new Date().getFullYear() + "-" + (new Date().getMonth() + 1) + "-" + (new Date().getDate());
        var plan = await db.query("select * from distribution_plans WHERE plan_date='" + req.query.action_date + "'");
				
		if (plan.length == 0) {
				res.send({ status: '404', data: [], result: 'ISGS_no_plan', message: "isgs yet to upload capcity sheet." });
				return;
			}else{
			 if(plan[0].plan_stage == 1){	
				res.send({ status: '404', data: [], result: 'SLDC_no_plan', message: "isgs yet to upload capcity sheet." });
				return;
			  }
			///////////////////////////// Plan Stage 2 /////////////////////////////////////////////////  
			if(plan[0].plan_stage == 2){	
			
			
			     var plan_id = plan[0].id;
				    var plan_stage = plan[0].plan_stage;
					var plan_date = plan[0].plan_date
					result = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_source = 2");
                    //res.send({result});
					if (result.length == 0) {
						res.send({ status: '404', data: [], result: 'SLDC_plan_stage2', message: "isgs yet to upload capcity sheet." });
						return;
					}
					var latestVersion = result[0].version;
					
					var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + latestVersion );
						
						
						result_ent = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_type = 2 and txn_source = 2");
						var response_ent = {};
						if(result_ent =='')	{
							res.setHeader("Content-Type", "application/json");
							res.send({ status: result[0].txn_status, result: 'SLDC_plan_stage3', user: req.user, plan_stage: plan_stage, plan_id:plan_id, response_ent: response_ent, data: blocks, transaction_id: result[0].id});
							return;
						}			 
						
				        let isgsOrgs = await getAllOrgByType('ISGS');
						//res.send({req.user.user_id});
						for(let ii = 0; ii < isgsOrgs.length; ii++) {
							let results = await getEntitlementsFor(req.user.user_id, isgsOrgs[ii].user_id, result[0].id);
							if(results.length > 0)
								response_ent[isgsOrgs[ii].name] = results;
						}
						
						
				 	res.setHeader("Content-Type", "application/json");
					res.send({ status: result[0].txn_status, result: 'SLDC_plan_stage3', user: req.user, plan_stage: plan_stage, plan_id:plan_id, response_ent: response_ent, data: blocks, transaction_id: result[0].id});
					return;
				 
			
			
				//res.send({ status: '404', data: [], result: 'SLDC_plan_stage2', message: "isgs yet to upload capcity sheet." });
				//return;
			  }  
			 if(plan[0].plan_stage == 3){
				 
				    var plan_id = plan[0].id;
				    var plan_stage = plan[0].plan_stage;
					var plan_date = plan[0].plan_date
					result = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_source = 2");
                    //res.send({result});
					if (result.length == 0) {
						res.send({ status: '404', data: [], result: 'SLDC_plan_stage3', message: "isgs yet to upload capcity sheet." });
						return;
					}
					var latestVersion = result[0].version;
					
					var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + latestVersion );
										 
						var response_ent = {};
				        let isgsOrgs = await getAllOrgByType('ISGS');
						//res.send({req.user.user_id});
						for(let ii = 0; ii < isgsOrgs.length; ii++) {
							let results = await getEntitlementsFor(req.user.user_id, isgsOrgs[ii].user_id, result[0].id);
							if(results.length > 0)
								response_ent[isgsOrgs[ii].name] = results;
						}
						//res.send({ response_ent });
						result_Res_txn = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_type = 3 and user_id = "+req.user.user_id+" order by id desc");
						var Requisitions_status = '';
						let Requisitions = {};
						if(result_Res_txn !=''){
							Requisitions_status = 'Yes';
							var result_Res_txn_id = result_Res_txn[0].id;
							transaction_id = result_Res_txn[0].id;
							//let Requisitions = {};
							Requisitions = await getActiveRequisitionsAndEntitlements(result_Res_txn_id);
							//res.send({ id:plan_id });
							Requisitions.capacit = await getDeclaredCapacity(plan_id);
							//res.send({ Requisitions });
							Requisitions.plan= {
								plan_id: plan_id,
								plan_stage: plan_stage,
								plan_date: plan_date
							}
									
						}
						
				 	res.setHeader("Content-Type", "application/json");
					res.send({ status: result[0].txn_status, result: 'SLDC_plan_stage3', user: req.user, plan_stage: plan_stage, plan_id:plan_id, response_ent: response_ent, data: blocks, transaction_id: transaction_id, Requisitions: Requisitions, Requisitions_status:Requisitions_status });
					return;
				 
			 }	

            /////////////////////////////// Plan SLDC_plan_stage 4/////////////////////////
			
             if(plan[0].plan_stage == 4){
				 
				    var plan_id = plan[0].id;
				    var plan_stage = plan[0].plan_stage;
					var plan_date = plan[0].plan_date
					result = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_source = 2");
                    //res.send({result});
					if (result.length == 0) {
						res.send({ status: '404', data: [], result: 'SLDC_plan_stage3', message: "isgs yet to upload capcity sheet." });
						return;
					}
					var latestVersion = result[0].version;
					
					var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
						JOIN time_slots ts ON ts.id = dc.time_block \
						WHERE plan_id=" + plan_id + " and version = " + latestVersion );
										 
						var response_ent = {};
				        let isgsOrgs = await getAllOrgByType('ISGS');
						//res.send({status: req.user.user_id});
						for(let ii = 0; ii < isgsOrgs.length; ii++) {
							let results = await getEntitlementsFor(req.user.user_id, isgsOrgs[ii].user_id, result[0].id);
							if(results.length > 0)
								response_ent[isgsOrgs[ii].name] = results;
						}
						//res.send({ response_ent });
						result_Res_txn = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_type = 3 order by id desc");
						var result_Res_txn_id = result_Res_txn[0].id;
						//res.send({ result_Res_txn_id });
						let Requisitions = {};
						Requisitions = await getActiveRequisitionsAndEntitlements(result_Res_txn_id);
						//res.send({ id:plan_id });
						Requisitions.capacit = await getDeclaredCapacity(plan_id);
						//res.send({ Requisitions });
						Requisitions.plan= {
							plan_id: plan_id,
							plan_stage: plan_stage,
							plan_date: plan_date
						}
						
						///////////////// provisional ///////////////////////
						result_provisional_txn = await db.query("SELECT * FROM user_txns WHERE plan_id=" + plan_id + " and txn_type = 4 order by id desc");
						//res.send({ result_provisional_txn });
						var provisional = '';
						if(result_provisional_txn !=''){
						var result_provisional_txn_id = result_provisional_txn[0].id;
						
						provisional = await getActiveProvisional(result_provisional_txn_id);
						}				
								 
						res.setHeader("Content-Type", "application/json");
						res.send({ status: result[0].txn_status, result: 'SLDC_plan_stage3', user: req.user, plan_stage: plan_stage, plan_id:plan_id, response_ent: response_ent, data: blocks, transaction_id: transaction_id, Requisitions: Requisitions, provisional:provisional });
						return;
				 
			 }	

			 
			  
		}   
			
    }
    res.status(401);
    res.send({ message: 'Invalid user.' });
};
const updatePlan = async (req, res) => {
	
	
	//result = await db.query("UPDATE distribution_plans SET plan_stage = 2 WHERE id = "+ req.query.plan_id);
	result1 = await db.query("UPDATE user_txns SET txn_status = 2 WHERE plan_id = "+ req.query.plan_id + " and user_id=" + req.user.user_id);

    res.send({status:"Yes", message: "Capacity revisions (dispatch) is published." });
	
};

const getAllOrgByType = async function(orgType) {
    return await db.query("select up.id as user_id, o.name from organizations o \
     JOIN org_types_pl ot ON o.org_type = ot.id \
     JOIN user_profiles up ON up.organization = o.id WHERE ot.name = '" + orgType + "'");
}

const getEntitlementsFor = async function(sldc_id, isgs_id, txn_id) {
	//return await await sldc_id+'GG'+isgs_id+'HH'+txn_id;
    return await await db.query("SELECT time_block, time_description, entitled_power \
    FROM dgmsdb.entitlements e \
    JOIN time_slots ts ON e.time_block = ts.id \
    JOIN user_profiles ups ON e.sldc_id = ups.id \
    JOIN organizations o ON ups.organization = o.id \
    JOIN user_profiles upi ON e.isgs_id = upi.id \
    JOIN organizations oi ON upi.organization = oi.id \
    WHERE ups.id = '" + sldc_id + "' and upi.id='" + isgs_id + "' and e.txn_id=" + txn_id);
}

const getProvisionalForIsgs = async function(sldc_id, isgs_id, txn_id) {
	//return await await sldc_id+'GG'+isgs_id+'HH'+txn_id;
    return await await db.query("SELECT time_block, time_description, energy \
    FROM dgmsdb.provisional_schedules ps \
    JOIN time_slots ts ON ps.time_block = ts.id \
    JOIN user_profiles ups ON ps.sldc_id = ups.id \
    JOIN organizations o ON ups.organization = o.id \
    JOIN user_profiles upi ON ps.isgs_id = upi.id \
    JOIN organizations oi ON upi.organization = oi.id \
    WHERE ups.id = '" + sldc_id + "' and upi.id='" + isgs_id + "' and ps.txn_id=" + txn_id);
}

const getActiveRequisitionsAndEntitlements = async(result_Res_txn_id) => {
    var sldcOrgs = await getAllOrgByType('SLDC');
    var isgsOrgs = await getAllOrgByType('ISGS');

    var response = {requisitions:{},entitlements:{}};
    for(var si = 0; si < sldcOrgs.length; si++) {
        for(var ii = 0; ii < isgsOrgs.length; ii++) {
            var requisitionData = await getRequisitionsFor(sldcOrgs[si].name , isgsOrgs[ii].name, result_Res_txn_id);
            var entitlementData = await getEntitlementsForRe(sldcOrgs[si].name , isgsOrgs[ii].name);
            if(response.requisitions[sldcOrgs[si].name] === undefined) response.requisitions[sldcOrgs[si].name] = {};
            response.requisitions[sldcOrgs[si].name][isgsOrgs[ii].name] = requisitionData;
            if(response.entitlements[sldcOrgs[si].name] === undefined) response.entitlements[sldcOrgs[si].name] = {};
            response.entitlements[sldcOrgs[si].name][isgsOrgs[ii].name] = entitlementData;

        }
    }
    return response;
}


const getActiveProvisional = async(result_Res_txn_id) => {
    var sldcOrgs = await getAllOrgByType('SLDC');
    var isgsOrgs = await getAllOrgByType('ISGS');

    var response = {provisional:{}};
    for(var si = 0; si < sldcOrgs.length; si++) {
        for(var ii = 0; ii < isgsOrgs.length; ii++) {
            var provisionalData = await getProvisional(sldcOrgs[si].name , isgsOrgs[ii].name, result_Res_txn_id);
            //return provisionalData;
            if(response.provisional[sldcOrgs[si].name] === undefined) response.provisional[sldcOrgs[si].name] = {};
            response.provisional[sldcOrgs[si].name][isgsOrgs[ii].name] = provisionalData;
            
        }
    }
    return response;
}


const getProvisional = async function(sldc, isgs, result_Res_txn_id) {
    return await db.query("SELECT time_block, time_description, energy FROM provisional_schedules ps \
    JOIN time_slots ts ON ps.time_block = ts.id \
    JOIN user_profiles ups ON ps.sldc_id = ups.id \
    JOIN organizations o ON ups.organization = o.id \
    JOIN user_profiles upi ON ps.isgs_id = upi.id \
    JOIN organizations oi ON upi.organization = oi.id \
    WHERE o.name = '" + sldc + "' and oi.name='" + isgs + "' and txn_id='" + result_Res_txn_id + "'");
}


const getRequisitionsFor = async function(sldc, isgs, result_Res_txn_id) {
	var datetime = new Date();
	var date_c = datetime.toISOString().slice(0,10)+' '+ datetime.toISOString().slice(11,19)
    return await db.query("SELECT time_block, time_description, requisitioned_power FROM requisitions rq \
    JOIN time_slots ts ON rq.time_block = ts.id \
    JOIN user_profiles ups ON rq.sldc_id = ups.id \
    JOIN organizations o ON ups.organization = o.id \
    JOIN user_profiles upi ON rq.isgs_id = upi.id \
    JOIN organizations oi ON upi.organization = oi.id \
    WHERE o.name = '" + sldc + "' and oi.name='" + isgs + "' and txn_id='" + result_Res_txn_id + "'");
}

const getRequisitionsForRldc = async function(isgs, sldc, result_Res_txn_id) {
    return await db.query("SELECT time_block, time_description, requisitioned_power FROM requisitions rq \
    JOIN time_slots ts ON rq.time_block = ts.id \
    WHERE rq.isgs_id = '" + isgs + "' and rq.sldc_id='" + sldc + "' and txn_id='" + result_Res_txn_id + "'");
}

const getEntitlementsRldc = async function(isgs, sldc, txt_max_id) {
    return await db.query("SELECT time_block, time_description, entitled_power FROM entitlements en \
    JOIN time_slots ts ON en.time_block = ts.id \
    WHERE en.isgs_id = '" + isgs + "' and en.sldc_id='" + sldc + "' and txn_id='" + txt_max_id + "'");
}

const getEntitlementsForRe = async function(sldc, isgs) {
    return await await db.query("SELECT time_block, time_description, entitled_power FROM dgmsdb.entitlements en \
    JOIN time_slots ts ON en.time_block = ts.id \
    JOIN user_profiles ups ON en.sldc_id = ups.id \
    JOIN organizations o ON ups.organization = o.id \
    JOIN user_profiles upi ON en.isgs_id = upi.id \
    JOIN organizations oi ON upi.organization = oi.id \
    WHERE o.name = '" + sldc + "' and oi.name='" + isgs + "';");
}

const getDeclaredCapacity = async (plan_id) => {
        var transactions = await db.query("SELECT user_id, max(version) as version FROM user_txns WHERE plan_id=" + plan_id + " and txn_status = 2 group by user_id");
        
        if(transactions.length == 0) {
            res.status(404);
            res.send({message:'No published capacity found for the date.'});
            return ;
        }
        const capacity = {};
        for(var index = 0; index < transactions.length; index++ ) {
            var userAccount = await db.query(" \
            SELECT up.id, full_name, ur.name as role, ot.name as org_type, o.name as org_name FROM user_profiles up \
            JOIN user_roles_pl ur ON up.role = ur.id \
            JOIN organizations o ON o.id = up.organization \
            JOIN org_types_pl ot ON ot.id = o.org_type \
            WHERE up.id =" + transactions[index].user_id);

            userAccount = userAccount[0];
            console.log(userAccount);
            var blocks = await db.query("SELECT dc.*, ts.time_description FROM declared_capacity dc JOIN user_txns ut ON dc.txn_id = ut.id \
            JOIN time_slots ts ON ts.id = dc.time_block \
            WHERE plan_id=" + plan_id + " and version = " + transactions[index].version +" and user_id = "+transactions[index].user_id);

            capacity[userAccount['org_name']] = blocks;
        }
        return capacity;
}

module.exports = {
    getPlanData: getPlanData,
	updatePlan:  updatePlan 

};
