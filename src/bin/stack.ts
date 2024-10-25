#!/usr/bin/env node

// Copyright 2023 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
// Licensed under the Amazon Software License  http://aws.amazon.com/asl/

import "source-map-support/register";

import { App, Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { BackendStack } from "../lib/backend-stack";

// NOTE: due to an inherent issue with pipelines package, Aspects will not
// visit constructs in nested stages, so each stage has to manage checks and
// in order to generate nag reports we need to run `cdk synth '**'`.

const app = new App();
new BackendStack(app, "BackendStack");

Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
