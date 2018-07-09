
//Define course variables object
// isHosted = 1 means that it is on the VinciWorks CLMS
// isHosted = 0 means that it is a SCORM course on a third-party LMS
var isHosted = 1;


//Set scorm variables on non-hosted courses or when there is no active SCORM/LSM session. Function is called from  courselaunch.js if isHosted is set to 0.

function getDefaultSuspendData() {
   return 'Varpassmark=50;'
    + 'Var_firm_name=notReview;'
    + 'VarPDFAtLaunch=True;'
    + 'Var_commoncoursepath=https://uk.onlinecompliance.org/SharedScormCourses2012/customscormcourses/internal;'
    + 'Var_courseid=84;'
    + 'Var_FlashEnabledOrNot=false';
}





