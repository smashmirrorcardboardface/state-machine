import { StackContext, Api, Function } from "sst/constructs";
import {LambdaInvoke} from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Chain, Parallel, StateMachine } from "aws-cdk-lib/aws-stepfunctions";

export function MyStack({ stack }: StackContext) {

  // task1
  const callYoutubeTask = new LambdaInvoke(stack, "callYoutubetask", {
    lambdaFunction: new Function(stack, "callYoutubeTask-func", {
      handler: "packages/functions/src/callYoutubeAPI.handler",
      environment: {
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || '',
      },
    })
  });

  // task2a
  const countTagsTask = new LambdaInvoke(stack, "countTagsTask", {
    lambdaFunction: new Function(stack, "countTagsTask-func", {
      handler: "packages/functions/src/countTags.handler",
    })
  });

  // task2b
  const countStatisticsTask = new LambdaInvoke(stack, "countStatisticsTask", {
    lambdaFunction: new Function(stack, "countStatisticsTask-func", {
      handler: "packages/functions/src/countStatistics.handler",
    })
  });

  // task3
  const aggregateData = new LambdaInvoke(stack, "aggregateData", {
    lambdaFunction: new Function(stack, "aggregateData-func", {
      handler: "packages/functions/src/aggregateData.handler",
    })
  });


  const parallel = new Parallel(stack, "ParallelCompute");
  const stateDefiniton = Chain.start(callYoutubeTask)
    .next(parallel.branch(countTagsTask).branch(countStatisticsTask))
    .next(aggregateData);

  const stateMachine = new StateMachine(stack, "stateMachineExample", {
    definition: stateDefiniton,
  });

  const api = new Api(stack, "apiStartMachine", {
    routes: {
      "GET /stateMachine": {
        function:{
          handler: "packages/functions/src/startMachine.handler",
          environment: {
            STATE_MACHINE: stateMachine.stateMachineArn,
          },
        }
      }
    },
  });

  api.attachPermissionsToRoute("GET /stateMachine", [
    [stateMachine, "grantStartExecution"],
  ]);

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
