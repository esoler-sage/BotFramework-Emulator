//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.
//
// Microsoft Bot Framework: http://botframework.com
//
// Bot Framework Emulator Github:
// https://github.com/Microsoft/BotFramwork-Emulator
//
// Copyright (c) Microsoft Corporation
// All rights reserved.
//
// MIT License:
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
//
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED ""AS IS"", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

import { CommandServiceImpl } from './service';
import { ipcMain, ipcRenderer } from 'electron';

export * from './registry';
export * from './service';
const commandServiceByChannelId = {};

function getCommandService(channelId: string): CommandServiceImpl {
  if (commandServiceByChannelId[channelId]) {
    return commandServiceByChannelId[channelId];
  }
  const ipc = process.type === 'browser' ? ipcMain : ipcRenderer;
  commandServiceByChannelId[channelId] = new CommandServiceImpl(ipc);
  return commandServiceByChannelId[channelId];
}

export function CommandServiceInstance(channelId = 'command-service'): PropertyDecorator {
  return function(elementDescriptor: any) {
    const { key, descriptor } = elementDescriptor;
    delete descriptor.writable;
    elementDescriptor.extras = [
      {
        kind: 'method',
        key,
        placement: 'prototype',
        descriptor: {
          ...descriptor,
          get: function() {
            return getCommandService(channelId);
          },
        },
      },
    ];
    return elementDescriptor;
  };
}

export function Command(id: string, channelId: string = 'command-service'): MethodDecorator {
  return function(elementDescriptor: any) {
    const { key, descriptor } = elementDescriptor;
    const initializer = function() {
      const bound = this[key].bind(this);
      const { registry } = getCommandService(channelId);
      registry.registerCommand(id, bound);
      return bound;
    };

    elementDescriptor.extras = [
      {
        kind: 'field',
        key,
        placement: 'own',
        initializer,
        descriptor: { ...descriptor, value: undefined },
      },
    ];
    return elementDescriptor;
  };
}
