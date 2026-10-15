require('dotenv').config();
require('./src/web/roleCreationPatch').install();
require('./src/web/roleDeletionPatch').install();
require('./src/web/dashboardRoleListPatch').install();
require('./src/web/starboardDashboardPatch').install();
require('./src/web/backupDashboardPatch').install();
require('./src/index');
