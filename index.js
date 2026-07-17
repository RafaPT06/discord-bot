require('dotenv').config();
require('./src/web/roleCreationPatch').install();
require('./src/web/roleDeletionPatch').install();
require('./src/index');
