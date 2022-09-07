#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { GamedayVpc } from "../lib/vpc";
import { GamedayEcs } from "../lib/ecs/ecs-stdout";
import { GamedayEcsXray } from "../lib/ecs/ecs-xray";
import { GamedayEcsLocalLog } from "../lib/ecs/ecs-locallog";
import { GamedayEcsOnEc2 } from "../lib/ecs/ecs-on-ec2";
import { Bastion } from "../lib/bastion";
import { AuroraMysql } from "../lib/rds/aurora-mysql";
import { AuroraPostgres } from "../lib/rds/aurora-postres";
import { MysqlFromSnapshot } from "../lib/rds/mysql-from-snapshot";
import { PostgresFromSnapshot } from "../lib/rds/postgres-from-snapshot";
import { RdsMysql } from "../lib/rds/rds-mysql";
import { RdsPostgres } from "../lib/rds/rds-postgres";

const app = new cdk.App();
const vpcStack = new GamedayVpc(app, "GamedayVpc", {});

const ecsStack = new GamedayEcs(app, "GamedayECS", {
  vpc: vpcStack.vpc,
});
ecsStack.addDependency(vpcStack);

const ecsXrayStack = new GamedayEcsXray(app, "GamedayEcsXray", {
  vpc: vpcStack.vpc,
});
ecsXrayStack.addDependency(vpcStack);

const ecsLocalLog = new GamedayEcsLocalLog(app, "GamedayEcsLocalLog", {
  vpc: vpcStack.vpc,
});
ecsLocalLog.addDependency(vpcStack);

const ecsOnEc2 = new GamedayEcsOnEc2(app, "GamedayEcsOnEc2", {
  vpc: vpcStack.vpc,
});
ecsOnEc2.addDependency(vpcStack);

new Bastion(app, "BastionStack", { vpc: vpcStack.vpc });
new AuroraMysql(app, "AuroraMysql", { vpc: vpcStack.vpc });
new AuroraPostgres(app, "AuroraPostgres", { vpc: vpcStack.vpc });
new RdsMysql(app, "RdsforMysql", { vpc: vpcStack.vpc });
new RdsPostgres(app, "RdsforPostgres", { vpc: vpcStack.vpc });
new MysqlFromSnapshot(app, "MysqlFromSnapshot", { vpc: vpcStack.vpc });
new PostgresFromSnapshot(app, "PostgresFromSnaphot", { vpc: vpcStack.vpc });
