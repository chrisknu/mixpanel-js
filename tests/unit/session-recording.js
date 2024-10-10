/*
 * Test that basic SDK usage (init, track, etc) does not
 * blow up in non-browser (node.js) envs. These are not
 * tests of server-side tracking functionality (which is
 * currently not supported in the browser lib).
 */

import { expect } from 'chai';
import rrweb from 'rrweb';
import {SessionRecording} from '../../src/recorder/session-recording';
import sinon from 'sinon';
import localStorage from 'localStorage';

describe(`SessionRecording`, function() {
    beforeEach(function() {
        const mockMixpanelInstance = {
            get_distinct_id: () => `test-distinct-id`,
            get_config: () => ({
                token: `test-token`,
                record_sessions_percent: 100,
                record_min_ms: 0,
                record_max_ms: 24 * 60 * 60 * 1000,
                record_idle_timeout_ms: 30 * 60 * 1000,
            }),
        };
        this.replayId = `test-replay-id`;

        this.stopSpy = sinon.spy();
        this.onIdleTimeoutSpy = sinon.spy();
        this.onMaxLengthReachedSpy = sinon.spy();
        this.rrwebRecordStub = sinon.stub(rrweb, `record`).returns(this.stopSpy);
        this.sessionRecording = new SessionRecording({
            mixpanelInstance: mockMixpanelInstance,
            replayId: this.replayId,
            onIdleTimeout: this.onIdleTimeoutSpy,
            onMaxLengthReached: this.onMaxLengthReachedSpy,
            storage: localStorage,
        });
        this.flushSpy = sinon.spy(this.sessionRecording.batcher, `flush`);
    });

    afterEach(function () {
        sinon.restore();
    });

    it(`can start and stop recording`, function() {
        this.sessionRecording.startRecording();
        expect(this.rrwebRecordStub.calledOnce).to.be.true;
        expect(this.sessionRecording.isRrwebStopped()).to.be.false;

        this.sessionRecording.stopRecording();
        expect(this.stopSpy.calledOnce).to.be.true;
        expect(this.sessionRecording.isRrwebStopped()).to.be.true;
    });

    it(`flushes the batcher when stopRecording is called`, function() {
        this.sessionRecording.startRecording();
        expect(this.flushSpy.calledOnce).to.be.true;

        this.sessionRecording.stopRecording();
        expect(this.flushSpy.calledTwice).to.be.true;
    });

    it(`still flushes the batcher when stopRecording throws an error`, function() {
        this.rrwebRecordStub.restore();
        this.rrwebRecordStub = sinon.stub(rrweb, `record`).returns(function () {
            throw new Error(`test error`);
        });

        this.sessionRecording.startRecording();
        expect(this.flushSpy.calledOnce).to.be.true;

        this.sessionRecording.stopRecording();
        expect(this.flushSpy.calledTwice).to.be.true;
    });
});
