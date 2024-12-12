# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

# Permission is hereby granted, free of charge, to any person obtaining a copy of this
# software and associated documentation files (the "Software"), to deal in the Software
# without restriction, including without limitation the rights to use, copy, modify,
# merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
# permit persons to whom the Software is furnished to do so.

# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
# INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
# PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
# HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
# OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
# SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

import sys
import os
import boto3
from botocore.exceptions import NoCredentialsError
import time
import json
from dotenv import load_dotenv
from datetime import datetime


def check_credentials():
    try:
        session = boto3.Session()
        credentials = session.get_credentials()
        print(f"Access Key: {credentials}")
        print(f"Access Key: {credentials.access_key}")
        print(f"Secret Key: {credentials.secret_key}")
        # Token is None for non-temporary credentials
        print(f"Token: {credentials.token}")
    except NoCredentialsError:
        print("No AWS credentials found!")


def upload_to_s3(s3_bucket_name):
    s3 = boto3.client('s3')
    data_dir = "./data"
    files = os.listdir(data_dir)

    for file in files:
        file_path = os.path.join(data_dir, file)
        key = f"{file}"
        try:
            s3.upload_file(file_path, s3_bucket_name, key)
            print(f"Successfully uploaded {file} to {s3_bucket_name}/{key}")
        except Exception as e:
            print(f"Error uploading {file} to {s3_bucket_name}/{key}: {e}")


def start_ingestion(knowledgebase_id, knowledgebase_datasource_id):
    client = boto3.client('bedrock-agent', region_name='us-east-1')
    response = client.start_ingestion_job(
        dataSourceId=knowledgebase_datasource_id,
        description='First Ingestion',
        knowledgeBaseId=knowledgebase_id
    )
    return response


def check_ingestion_job_status(dataSourceId, ingestionJobId, knowledgeBaseId):
    client = boto3.client('bedrock-agent', region_name='us-east-1')
    while True:
        response = client.get_ingestion_job(
            dataSourceId=dataSourceId,
            ingestionJobId=ingestionJobId,
            knowledgeBaseId=knowledgeBaseId
        )

        ingestion_job = response['ingestionJob']
        status = ingestion_job['status']

        if status in ['COMPLETE', 'FAILED', 'STOPPED']:
            break

        print(f"Ingestion job status: {status} (Checking again in 30 seconds)")
        time.sleep(30)

    print(f"Final ingestion job status: {status}")

    if status == 'COMPLETE':
        print("Ingestion job completed successfully.")
    elif status == 'FAILED':
        print("Ingestion job failed.")
        print("Failure reasons:")
        for reason in ingestion_job['failureReasons']:
            print(f"- {reason}")
    else:
        print("Ingestion job stopped.")


if __name__ == "__main__":
    with open("src/outputs.json", "r") as f:
        outputs = json.load(f)

    load_dotenv()

    stack_name = list(outputs.keys())[0]
    knowledgebase_id = outputs[stack_name]["KnowledgeBaseId"]
    knowledgebase_datasource_id = outputs[stack_name]["DataSourceId"]
    s3_bucket_name = outputs[stack_name]["ResumeBucketName"]

    print("outputs:", {knowledgebase_id,
          knowledgebase_datasource_id, s3_bucket_name})

    check_credentials()
    upload_to_s3(s3_bucket_name)
    time.sleep(2)

    response = start_ingestion(knowledgebase_id, knowledgebase_datasource_id)

    ingestion_job_id = response['ingestionJob']['ingestionJobId']
    check_ingestion_job_status(
        knowledgebase_datasource_id, ingestion_job_id, knowledgebase_id)
