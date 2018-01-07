import * as express from 'express';

import util from './util';
import config from './config';

// import * as DomustoServer from './domusto/Domusto';
import DomustoDevicesManager from './domusto/DomustoDevicesManager';
import DomustoPluginsManager from './domusto/DomustoPluginsManager';
import DomustoLogger from './domusto/DomustoLogger';

// INTERFACES
import { Domusto } from './domusto/DomustoInterfaces';

export class Server {

  public app: express.Application;

  /**
   * Bootstrap the application.
   *
   * @class Server
   * @method bootstrap
   * @static
   * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
   */
  public static bootstrap(): Server {
    return new Server();
  }

  constructor() {

    // Make sure the plugins are ready before the devices initialise to avoid race conditions
    DomustoPluginsManager.init().then(() => {
      DomustoDevicesManager.init();
    });

    DomustoLogger.init();

    this.app = express();
    this.setHeaders();
    this.initRoutes();
  }

  private setHeaders() {

    this.app.use(function (req, res, next) {

      // Website you wish to allow to connect
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Request methods you wish to allow
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

      // Request headers you wish to allow
      res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

      // Set to true if you need the website to include cookies in the requests sent
      // to the API (e.g. in case you use sessions)
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Pass to next layer of middleware
      next();
    });

  }

  /**
   * Set the routes for the API
   *
   * @private
   * @memberof Server
   */
  private initRoutes() {

    let router: express.Router;
    router = express.Router();

    // use router middleware
    this.app.use(router);

    this.app.route('/output').get((req, res) => {
      res.json(DomustoDevicesManager.getDevicesByRole(Domusto.DeviceRole.output));
    });

    this.app.route('/input').get((req, res) => {
      res.json(DomustoDevicesManager.getDevicesByRole(Domusto.DeviceRole.input));
    });

    this.app.route('/output/command/:deviceId/:state').get((req, res) => {
      DomustoDevicesManager.outputCommand(req.params.deviceId, req.params.state, result => {
        res.json(result);
      });
    });
  }

}