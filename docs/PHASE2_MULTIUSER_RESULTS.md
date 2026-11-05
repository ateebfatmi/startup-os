# Phase 2 multi-user acceptance

**Overall result: BLOCKED.** No approved hosted targets, test identities, or independent physical-device sessions were available. Zero hosted, physical-device, cross-network or live-provider tests were executed. Local two-tab results are tracked separately.

## Approved-run procedure

1. Record the prelaunch app origin, deployment revision, Supabase ref, run ID and test account labels A, B and C. Use independent browser contexts for each identity. Reserve a separate context with no cookies for anonymous tests. Confirm the intended project with the guarded smoke command.
2. Register and verify A through the test mailbox. Create Alpha as A, verify the owner role through a session-bound database read, create a project and three uniquely tagged tasks, and upload a small synthetic text file. Generate a member invitation and deliver the link through the approved test channel. The app provides a link for sharing.
3. Register and verify B with a distinct test address. Open the invitation in B's independent context. Verify project, task and signed-download access, update one authorized task, and observe convergence in A. Save the response codes and redacted record IDs. Exercise wrong email, expired, invalid and replay links with isolated fixtures.
4. Open the office in both sessions. Verify avatars and movement both ways. Draw and edit the same whiteboard in each context, then reload and verify both edits. Check offline/reconnect and stale presence expiry. Confirm task updates converge according to the existing polling behavior.
5. Use separate physical devices and real microphones/cameras. Test same Wi-Fi, then Wi-Fi versus a mobile hotspot or another independently routed network. Verify two-way intelligible audio, video, mute, camera toggle, screen-share start/stop, permission denial, interruption, reconnect and media release. Inspect the selected ICE candidate pair through browser WebRTC diagnostics and confirm relay candidate use in a forced-relay diagnostic. Record candidate types, timestamps and connection states with no IPs or credentials.
6. Sign out and sign back in independently. Verify workspace, tasks, board and file persistence. Then use C to create Beta and attempt Alpha access by guessed ID, including task mutation, private file retrieval and channel joins. Remove B from Alpha in a separate fixture and repeat the read/write and existing-connection checks.
7. Capture pass/fail per matrix ID, browser/version, device, network category, redacted API status and evidence location. A partial run remains partial. Destructive cleanup of hosted fixtures requires approval.

| Gate | Result |
|---|---|
| Verified accounts, onboarding and invitations | BLOCKED |
| Independent-session tasks, files and workspace persistence | BLOCKED |
| Independent authenticated presence, collaboration and reconnect | BLOCKED |
| Real audio/video and selected TURN relay across separate networks | BLOCKED |
| Beta outsider and removed-member denial | BLOCKED |

The guarded independent-session Playwright case is prepared for a synthetic owner, member and outsider. It checks anonymous 401, authorized fixture visibility, and an empty outsider response for the same workspace ID. The case has not been executed against a hosted target.
