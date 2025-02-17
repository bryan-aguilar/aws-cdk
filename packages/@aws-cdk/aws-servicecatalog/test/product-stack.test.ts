import * as fs from 'fs';
import * as path from 'path';
import * as s3 from '@aws-cdk/aws-s3';
import * as s3_assets from '@aws-cdk/aws-s3-assets';
import * as sns from '@aws-cdk/aws-sns';
import * as cdk from '@aws-cdk/core';
import { Construct } from 'constructs';
import * as servicecatalog from '../lib';

/* eslint-disable quote-props */
describe('ProductStack', () => {
  test('Asset bucket undefined in product stack without assets', () => {
    // GIVEN
    const app = new cdk.App();
    const mainStack = new cdk.Stack(app, 'MyStack');
    const productStack = new servicecatalog.ProductStack(mainStack, 'MyProductStack');

    // THEN
    expect(productStack._getAssetBucket()).toBeUndefined();
  }),

  test('Used defined Asset bucket in product stack with assets', () => {
    // GIVEN
    const app = new cdk.App(
      { outdir: 'cdk.out' },
    );
    const mainStack = new cdk.Stack(app, 'MyStack');
    const testAssetBucket = new s3.Bucket(mainStack, 'TestAssetBucket', {
      bucketName: 'test-asset-bucket',
    });
    const productStack = new servicecatalog.ProductStack(mainStack, 'MyProductStack', {
      assetBucket: testAssetBucket,
    });

    // WHEN
    new s3_assets.Asset(productStack, 'testAsset', {
      path: path.join(__dirname, 'assets'),
    });

    // THEN
    expect(productStack._getAssetBucket()).toBeDefined();
  });

  test('fails if bucketName is not specified in product stack with assets', () => {
    // GIVEN
    const app = new cdk.App(
      { outdir: 'cdk.out' },
    );
    const mainStack = new cdk.Stack(app, 'MyStack');
    const testAssetBucket = new s3.Bucket(mainStack, 'TestAssetBucket', {
    });
    const productStack = new servicecatalog.ProductStack(mainStack, 'MyProductStack', {
      assetBucket: testAssetBucket,
    });

    // THEN
    expect(() => {
      new s3_assets.Asset(productStack, 'testAsset', {
        path: path.join(__dirname, 'assets'),
      });
    }).toThrow('A bucketName must be provided to use Assets');
  });

  test('fails if Asset bucket is not defined in product stack with assets', () => {
    // GIVEN
    const app = new cdk.App();
    const mainStack = new cdk.Stack(app, 'MyStack');
    const productStack = new servicecatalog.ProductStack(mainStack, 'MyProductStack');

    // THEN
    expect(() => {
      new s3_assets.Asset(productStack, 'testAsset', {
        path: path.join(__dirname, 'assets'),
      });
    }).toThrow('An Asset Bucket must be provided to use Assets');
  });

  test('fails if defined at root', () => {
    // GIVEN
    const app = new cdk.App();

    // THEN
    expect(() => {
      new servicecatalog.ProductStack(app, 'ProductStack');
    }).toThrow(/must be defined within scope of another non-product stack/);
  }),

  test('fails if defined without a parent stack', () => {
    // GIVEN
    const app = new cdk.App();
    const group = new Construct(app, 'group');

    // THEN
    expect(() => {
      new servicecatalog.ProductStack(group, 'ProductStack');
    }).toThrow(/must be defined within scope of another non-product stack/);
  }),

  test('can be defined as a direct child or an indirect child of a Stack', () => {
    // GIVEN
    const parent = new cdk.Stack();

    // THEN
    expect(() => {
      new servicecatalog.ProductStack(parent, 'direct');
    }).not.toThrow();
  });

  test('product stack is not synthesized as a stack artifact into the assembly', () => {
    // GIVEN
    const app = new cdk.App();
    const parentStack = new cdk.Stack(app, 'ParentStack');
    new servicecatalog.ProductStack(parentStack, 'ProductStack');

    // WHEN
    const assembly = app.synth();

    // THEN
    expect(assembly.artifacts.length).toEqual(3);
  });

  test('the template of the product stack is synthesized into the cloud assembly', () => {
    // GIVEN
    const app = new cdk.App();
    const parent = new cdk.Stack(app, 'ParentStack');
    const productStack = new servicecatalog.ProductStack(parent, 'ProductStack');
    new sns.Topic(productStack, 'SNSTopicProduct');

    // WHEN
    const assembly = app.synth();

    // THEN
    const template = JSON.parse(fs.readFileSync(path.join(assembly.directory, productStack.templateFile), 'utf-8'));
    expect(template).toEqual({
      Resources: {
        SNSTopicProduct20605D98: {
          Type: 'AWS::SNS::Topic',
        },
      },
    });
  });
});
